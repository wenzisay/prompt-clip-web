use keyring::Entry;
use quick_xml::events::Event;
use quick_xml::Reader;
use reqwest::{Client, Method, StatusCode, Url};
use serde::Deserialize;
use std::time::Duration;

const KEYRING_SERVICE: &str = "com.promptclip.webdav";
const MAX_RESPONSE_BYTES: usize = 64 * 1024 * 1024;

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebDavConnection {
    base_url: String,
    username: String,
    remote_path: String,
    credential_id: String,
}

fn validate_relative_path(path: &str) -> Result<(), String> {
    if path.starts_with('/')
        || path.starts_with('\\')
        || path.split(['/', '\\']).any(|part| part == "..")
    {
        return Err("Invalid remote path".to_string());
    }
    Ok(())
}

fn target_url(connection: &WebDavConnection, path: &str) -> Result<Url, String> {
    validate_relative_path(&connection.remote_path)?;
    validate_relative_path(path)?;
    let mut url = Url::parse(&connection.base_url).map_err(|_| "Invalid WebDAV URL".to_string())?;
    if url.scheme() != "https" {
        return Err("WebDAV URL must use HTTPS".to_string());
    }
    let mut segments = url
        .path_segments_mut()
        .map_err(|_| "Invalid WebDAV URL".to_string())?;
    segments.pop_if_empty();
    for segment in connection
        .remote_path
        .split('/')
        .chain(path.split('/'))
        .filter(|segment| !segment.is_empty())
    {
        segments.push(segment);
    }
    drop(segments);
    Ok(url)
}

fn password(credential_id: &str) -> Result<String, String> {
    Entry::new(KEYRING_SERVICE, credential_id)
        .map_err(|_| "Unable to access system credentials".to_string())?
        .get_password()
        .map_err(|_| "WebDAV password is not configured".to_string())
}

fn client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| "Unable to create WebDAV client".to_string())
}

async fn send(
    connection: &WebDavConnection,
    method: Method,
    path: &str,
    body: Option<Vec<u8>>,
) -> Result<reqwest::Response, String> {
    let mut request = client()?
        .request(method, target_url(connection, path)?)
        .basic_auth(
            &connection.username,
            Some(password(&connection.credential_id)?),
        );
    if let Some(content) = body {
        request = request.body(content);
    }
    request
        .send()
        .await
        .map_err(|_| "WebDAV connection failed".to_string())
}

fn ensure_success(status: StatusCode) -> Result<(), String> {
    match status {
        StatusCode::UNAUTHORIZED => Err("WebDAV authentication failed".to_string()),
        StatusCode::FORBIDDEN => Err("WebDAV permission denied".to_string()),
        StatusCode::NOT_FOUND => Err("WEBDAV_REMOTE_DIRECTORY_NOT_FOUND".to_string()),
        status if status.is_success() => Ok(()),
        status => Err(format!(
            "WebDAV request failed with status {}",
            status.as_u16()
        )),
    }
}

fn should_replace_destination_and_retry(status: StatusCode) -> bool {
    status == StatusCode::CONFLICT || status == StatusCode::PRECONDITION_FAILED
}

async fn response_bytes(response: reqwest::Response) -> Result<Vec<u8>, String> {
    ensure_success(response.status())?;
    if response
        .content_length()
        .is_some_and(|size| size > MAX_RESPONSE_BYTES as u64)
    {
        return Err("WebDAV response is too large".to_string());
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|_| "Unable to read WebDAV response".to_string())?;
    if bytes.len() > MAX_RESPONSE_BYTES {
        return Err("WebDAV response is too large".to_string());
    }
    Ok(bytes.to_vec())
}

async fn ensure_parent_directories(
    connection: &WebDavConnection,
    path: &str,
) -> Result<(), String> {
    let parts: Vec<&str> = path.split('/').filter(|part| !part.is_empty()).collect();
    for end in 1..parts.len() {
        let directory = parts[..end].join("/");
        let response = send(
            connection,
            Method::from_bytes(b"MKCOL").unwrap(),
            &directory,
            None,
        )
        .await?;
        if response.status() != StatusCode::METHOD_NOT_ALLOWED
            && response.status() != StatusCode::CONFLICT
        {
            ensure_success(response.status())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn webdav_store_password(credential_id: String, password: String) -> Result<(), String> {
    if credential_id.trim().is_empty() || password.is_empty() {
        return Err("Credential ID and password are required".to_string());
    }
    Entry::new(KEYRING_SERVICE, &credential_id)
        .map_err(|_| "Unable to access system credentials".to_string())?
        .set_password(&password)
        .map_err(|_| "Unable to save WebDAV password".to_string())
}

#[tauri::command]
pub fn webdav_delete_password(credential_id: String) -> Result<(), String> {
    Entry::new(KEYRING_SERVICE, &credential_id)
        .map_err(|_| "Unable to access system credentials".to_string())?
        .delete_credential()
        .map_err(|_| "Unable to delete WebDAV password".to_string())
}

#[tauri::command]
pub async fn webdav_test_connection(connection: WebDavConnection) -> Result<(), String> {
    let response = send(
        &connection,
        Method::from_bytes(b"PROPFIND").unwrap(),
        "",
        None,
    )
    .await?;
    if response.status() == StatusCode::MULTI_STATUS || response.status().is_success() {
        Ok(())
    } else {
        ensure_success(response.status())
    }
}

#[tauri::command]
pub async fn webdav_list(connection: WebDavConnection) -> Result<Vec<String>, String> {
    let response = client()?
        .request(
            Method::from_bytes(b"PROPFIND").unwrap(),
            target_url(&connection, "")?,
        )
        .basic_auth(
            &connection.username,
            Some(password(&connection.credential_id)?),
        )
        .header("Depth", "infinity")
        .send()
        .await
        .map_err(|_| "WebDAV connection failed".to_string())?;
    let bytes = response_bytes(response).await?;
    let root_url = target_url(&connection, "")?;
    let root = percent_encoding::percent_decode_str(root_url.path())
        .decode_utf8_lossy()
        .trim_end_matches('/')
        .to_string();
    let mut reader = Reader::from_reader(bytes.as_slice());
    let mut paths = Vec::new();
    let mut in_href = false;
    loop {
        match reader.read_event() {
            Ok(Event::Start(event)) if event.local_name().as_ref() == b"href" => in_href = true,
            Ok(Event::Text(text)) if in_href => {
                let href = String::from_utf8_lossy(text.as_ref());
                let parsed = Url::parse(&href).or_else(|_| {
                    target_url(&connection, "")
                        .and_then(|url| url.join(&href).map_err(|error| error.to_string()))
                });
                if let Ok(url) = parsed {
                    let decoded =
                        percent_encoding::percent_decode_str(url.path()).decode_utf8_lossy();
                    if let Some(relative) = decoded.trim_end_matches('/').strip_prefix(&root) {
                        let relative = relative.trim_start_matches('/');
                        if !relative.is_empty() {
                            paths.push(relative.to_string());
                        }
                    }
                }
                in_href = false;
            }
            Ok(Event::Eof) => break,
            Err(_) => return Err("Invalid WebDAV listing response".to_string()),
            _ => {}
        }
    }
    Ok(paths)
}

#[tauri::command]
pub async fn webdav_read(
    connection: WebDavConnection,
    path: String,
) -> Result<Option<Vec<u8>>, String> {
    let response = send(&connection, Method::GET, &path, None).await?;
    if response.status() == StatusCode::NOT_FOUND {
        return Ok(None);
    }
    response_bytes(response).await.map(Some)
}

#[tauri::command]
pub async fn webdav_write(
    connection: WebDavConnection,
    path: String,
    content: Vec<u8>,
) -> Result<(), String> {
    ensure_parent_directories(&connection, &path).await?;
    let response = send(&connection, Method::PUT, &path, Some(content)).await?;
    ensure_success(response.status())
}

#[tauri::command]
pub async fn webdav_delete(connection: WebDavConnection, path: String) -> Result<(), String> {
    let response = send(&connection, Method::DELETE, &path, None).await?;
    if response.status() == StatusCode::NOT_FOUND {
        return Ok(());
    }
    ensure_success(response.status())
}

#[tauri::command]
pub async fn webdav_move(
    connection: WebDavConnection,
    from: String,
    to: String,
) -> Result<(), String> {
    async fn move_request(
        connection: &WebDavConnection,
        from: &str,
        to: &str,
    ) -> Result<reqwest::Response, String> {
        client()?
            .request(
                Method::from_bytes(b"MOVE").unwrap(),
                target_url(connection, from)?,
            )
            .basic_auth(
                &connection.username,
                Some(password(&connection.credential_id)?),
            )
            .header("Destination", target_url(connection, to)?.to_string())
            .header("Overwrite", "T")
            .send()
            .await
            .map_err(|_| "WebDAV connection failed".to_string())
    }

    let mut response = move_request(&connection, &from, &to).await?;
    if should_replace_destination_and_retry(response.status()) {
        webdav_delete(connection.clone(), to.clone()).await?;
        response = move_request(&connection, &from, &to).await?;
    }
    ensure_success(response.status())
}

#[cfg(test)]
mod tests {
    use super::{
        ensure_success, should_replace_destination_and_retry, target_url, validate_relative_path,
        WebDavConnection,
    };
    use reqwest::StatusCode;

    fn connection() -> WebDavConnection {
        WebDavConnection {
            base_url: "https://dav.example.com/root/".to_string(),
            username: "user".to_string(),
            remote_path: "Prompt Clip".to_string(),
            credential_id: "id".to_string(),
        }
    }

    #[test]
    fn encodes_remote_path_segments() {
        assert_eq!(
            target_url(&connection(), "folder/a b.md").unwrap().as_str(),
            "https://dav.example.com/root/Prompt%20Clip/folder/a%20b.md"
        );
    }

    #[test]
    fn rejects_path_traversal() {
        assert!(validate_relative_path("../secret").is_err());
    }

    #[test]
    fn returns_stable_error_code_for_missing_remote_directory() {
        assert_eq!(
            ensure_success(StatusCode::NOT_FOUND).unwrap_err(),
            "WEBDAV_REMOTE_DIRECTORY_NOT_FOUND"
        );
    }

    #[test]
    fn retries_move_by_replacing_destination_for_webdav_conflicts() {
        assert!(should_replace_destination_and_retry(StatusCode::CONFLICT));
        assert!(should_replace_destination_and_retry(
            StatusCode::PRECONDITION_FAILED
        ));
        assert!(!should_replace_destination_and_retry(StatusCode::FORBIDDEN));
    }
}
