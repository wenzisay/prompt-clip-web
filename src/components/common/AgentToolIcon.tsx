import { useEffect, useState } from 'react';
import { getAgentToolIcon } from '@/constants';

const ICON_SIZE = 24;

export interface AgentToolIconProps {
  iconId: string;
  alt?: string;
  className?: string;
}

/**
 * Renders a bundled Agent icon with stable intrinsic dimensions and a safe fallback.
 */
export function AgentToolIcon({
  iconId,
  alt = '',
  className = 'block h-full w-full object-contain',
}: AgentToolIconProps) {
  const fallbackSource = getAgentToolIcon('agents-skills');
  const [failedIconId, setFailedIconId] = useState<string | null>(null);
  const source = failedIconId === iconId ? fallbackSource : getAgentToolIcon(iconId);

  useEffect(() => {
    setFailedIconId(null);
  }, [iconId]);

  return (
    <img
      src={source}
      alt={alt}
      width={ICON_SIZE}
      height={ICON_SIZE}
      loading="eager"
      decoding="async"
      draggable={false}
      className={className}
      onError={() => setFailedIconId(iconId)}
    />
  );
}
