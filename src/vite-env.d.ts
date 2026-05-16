/// <reference types="vite/client" />

declare module '*.css' {
  const content: { className: string };
  export default content;
}

declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}
