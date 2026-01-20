import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

export interface MarkdownRendererProps {
  content: string;
  className?: string;
  useTypography?: boolean;
  compact?: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className,
  useTypography = false,
  compact = false,
}) => {
  // Schema seguro extendido para GFM
  const markdownSanitizeSchema = {
    ...defaultSchema,
    tagNames: [
      ...(defaultSchema.tagNames || []),
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "code",
      "pre",
      "img",
    ],
    attributes: {
      ...(defaultSchema.attributes || {}),
      code: [
        ...(defaultSchema.attributes && (defaultSchema.attributes as any).code
          ? (defaultSchema.attributes as any).code
          : []),
        ["className", "language-*"],
      ],
      a: [
        ...(defaultSchema.attributes && (defaultSchema.attributes as any).a
          ? (defaultSchema.attributes as any).a
          : []),
        ["target", ["_blank", "_self"]],
      ],
      img: [
        ...(defaultSchema.attributes && (defaultSchema.attributes as any).img
          ? (defaultSchema.attributes as any).img
          : []),
        ["src", true],
        ["alt", true],
        ["title", true],
        ["width", true],
        ["height", true],
      ],
      th: [
        ...(defaultSchema.attributes && (defaultSchema.attributes as any).th
          ? (defaultSchema.attributes as any).th
          : []),
        ["colspan", true],
        ["rowspan", true],
      ],
      td: [
        ...(defaultSchema.attributes && (defaultSchema.attributes as any).td
          ? (defaultSchema.attributes as any).td
          : []),
        ["colspan", true],
        ["rowspan", true],
      ],
    },
  } as const;

  const components = {
    table: (props: any) => (
      <div className={"w-full overflow-x-auto!"}>
        <table
          className={
            "min-w-full! border! border-gray-200! text-sm! border-collapse! table-auto!"
          }
        >
          {props.children}
        </table>
      </div>
    ),
    thead: (props: any) => (
      <thead className={"bg-gray-50!"}>{props.children}</thead>
    ),
    th: (props: any) => (
      <th
        className={
          "border! border-gray-200! px-3! py-2! text-left! font-semibold!"
        }
      >
        {props.children}
      </th>
    ),
    tr: (props: any) => <tr className={"odd:bg-gray-50!"} {...props} />,
    td: (props: any) => (
      <td
        className={
          "border! border-gray-200! px-3! py-2! align-top! break-words!"
        }
      >
        {props.children}
      </td>
    ),
    img: ({ src, alt, title, ...rest }: any) => (
      // Imagen responsiva con altura máxima para evitar que sea demasiado grande
      <img
        src={src}
        alt={alt || ""}
        title={title}
        className={
          "mx-auto my-3! max-w-full! h-auto! object-contain! rounded-md! shadow-sm! max-h-96! md:max-h-[32rem]!"
        }
        loading="lazy"
        {...rest}
      />
    ),
    pre: (props: any) => (
      <pre
        className={
          "rounded! bg-gray-100! text-gray-900! p-3! overflow-auto! border! border-gray-200!"
        }
      >
        {props.children}
      </pre>
    ),
    code({ inline, className: cls, children, ...props }: any) {
      if (inline) {
        return (
          <code
            className={"px-1! py-0.5! rounded! bg-gray-100! text-gray-900!"}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <pre
          className={
            "rounded! bg-gray-100! text-gray-900! p-3! overflow-auto! border! border-gray-200!"
          }
        >
          <code className={cls} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    h1: (props: any) => (
      <h1 className={"text-2xl! font-bold! mb-3!"} {...props} />
    ),
    h2: (props: any) => (
      <h2 className={"text-xl! font-semibold! mb-2!"} {...props} />
    ),
    h3: (props: any) => (
      <h3 className={"text-lg! font-semibold! mb-2!"} {...props} />
    ),
    p: (props: any) => <p className={"mb-3! leading-relaxed!"} {...props} />,
    ul: (props: any) => (
      <ul className={"list-disc! list-inside! space-y-1! mb-3!"} {...props} />
    ),
    ol: (props: any) => (
      <ol
        className={"list-decimal! list-inside! space-y-1! mb-3!"}
        {...props}
      />
    ),
    li: (props: any) => <li className={"ml-1!"} {...props} />,
  };

  const baseWrapper = useTypography
    ? "markdown-body prose! prose-sm!"
    : "markdown-body";

  const spacing = compact ? "space-y-2!" : "";

  return (
    <div
      className={[baseWrapper, spacing, className].filter(Boolean).join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema]]}
        components={components as any}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
