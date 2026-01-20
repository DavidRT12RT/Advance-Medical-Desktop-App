import React, { useState } from "react";
import { Wrench } from "lucide-react";
import { Tooltip, Modal } from "antd";
import MarkdownRenderer from "./MarkdownRenderer";

const Message = ({
  message,
  role,
  type,
  extraData,
}: {
  message: string;
  role: "user" | "assistant";
  type?: "loading" | undefined;
  extraData?: any;
}) => {
  const [toolInfo, setToolInfo] = useState<any>({
    isModalOpen: false,
    tool: null,
  });

  const [showMoreTools, setShowMoreTools] = useState(false);

  const getPrettyOutputPreview = (tool: any): string => {
    if (!tool || !tool.output_preview) return "";
    const raw = tool.output_preview;
    if (typeof raw !== "string") {
      try {
        return JSON.stringify(raw, null, 2);
      } catch {
        return String(raw);
      }
    }
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  };

  if (role === "user") {
    return (
      <div
        className="bg-gray-100! p-4! rounded-lg! self-end! w-fit!"
        style={{ marginLeft: "auto" }}
      >
        <MarkdownRenderer content={message} />
      </div>
    );
  }

  return (
    <div className="p-4! rounded-lg! self-start!">
      {type === "loading" ? (
        <p>Pensando...</p>
      ) : (
        <>
          {extraData?.length > 0 && (
            <div className="my-5! flex flex-wrap flex-row items-center gap-2 justify-start">
              {extraData
                ?.slice(0, showMoreTools ? extraData.length : 4)
                .map((t: any) => (
                  <Tooltip
                    key={t.call_id}
                    title={`${t.name} (CLICK para ver mas informacion)`}
                  >
                    <div
                      className="flex flex-row items-center gap-2 justify-start cursor-pointer!"
                      onClick={() =>
                        setToolInfo({ isModalOpen: true, tool: t })
                      }
                    >
                      <Wrench className="w-3.5! h-3.5!" />
                      <span>{t.name}</span>
                    </div>
                  </Tooltip>
                ))}
              {extraData?.length > 4 && (
                <button
                  onClick={() => setShowMoreTools(!showMoreTools)}
                  className="text-blue-500!"
                >
                  {showMoreTools ? "Mostrar menos" : "Mostrar más"}
                </button>
              )}
            </div>
          )}
          <MarkdownRenderer content={message} />

          {toolInfo.tool && (
            <Modal
              open={toolInfo.isModalOpen}
              title={toolInfo.tool?.name || "Detalle de herramienta"}
              onCancel={() =>
                setToolInfo({
                  isModalOpen: false,
                  tool: null,
                })
              }
              footer={null}
              width={800}
            >
              <div className="space-y-4!">
                <div>
                  <p className="text-sm! text-gray-500!">Nombre</p>
                  <p className="font-medium!">{toolInfo.tool?.name}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4!">
                  <div>
                    <p className="text-sm! text-gray-500!">Tipo</p>
                    <p className="font-mono! text-xs!">
                      {toolInfo.tool?.type || "mcp_tool"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm! text-gray-500!">Call ID</p>
                    <p className="font-mono! text-xs! break-all!">
                      {toolInfo.tool?.call_id}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4!">
                  <div>
                    <p className="text-sm! text-gray-500!">Inició</p>
                    <p className="font-mono! text-xs!">
                      {toolInfo.tool?.started_at}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm! text-gray-500!">Terminó</p>
                    <p className="font-mono! text-xs!">
                      {toolInfo.tool?.ended_at}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm! text-gray-500! mb-1!">
                    Argumentos (args)
                  </p>
                  <pre className="text-xs! bg-gray-900! text-gray-100! p-3! rounded-md! overflow-auto! max-h-64!">
                    {JSON.stringify(toolInfo.tool?.args ?? {}, null, 2)}
                  </pre>
                </div>

                <div>
                  <p className="text-sm! text-gray-500! mb-1!">
                    Output preview
                  </p>
                  <pre className="text-xs! bg-gray-900! text-gray-100! p-3! rounded-md! overflow-auto! max-h-64!">
                    {getPrettyOutputPreview(toolInfo.tool)}
                  </pre>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
};

export default Message;
