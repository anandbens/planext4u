import * as React from "react";
import { cn } from "@/lib/utils";
import { Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3, Type, Undo, Redo, Link, Strikethrough, AlignLeft, AlignCenter, AlignRight, Eye, Pencil } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  compact?: boolean;
}

const ToolbarButton = ({ icon: Icon, label, onAction, active }: { icon: React.ElementType; label: string; onAction: () => void; active?: boolean }) => (
  <button
    type="button"
    title={label}
    className={cn(
      "p-1.5 rounded hover:bg-secondary/80 transition-colors",
      active && "bg-secondary text-primary"
    )}
    onMouseDown={(e) => { e.preventDefault(); onAction(); }}
  >
    <Icon className="h-3.5 w-3.5" />
  </button>
);

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({ value, onChange, placeholder, className, minHeight = "150px", compact = false }, ref) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const isInitialMount = React.useRef(true);
    const [mode, setMode] = React.useState<"edit" | "preview">("edit");

    React.useEffect(() => {
      if (isInitialMount.current && editorRef.current) {
        editorRef.current.innerHTML = value || "";
        isInitialMount.current = false;
      }
    }, [value]);

    // Sync editor content when switching back to edit mode
    React.useEffect(() => {
      if (mode === "edit" && editorRef.current && !isInitialMount.current) {
        editorRef.current.innerHTML = value || "";
      }
    }, [mode]);

    const exec = (cmd: string, val?: string) => {
      document.execCommand(cmd, false, val);
      editorRef.current?.focus();
      handleInput();
    };

    const handleInput = () => {
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/html") || e.clipboardData.getData("text/plain");
      document.execCommand("insertHTML", false, text);
    };

    const insertLink = () => {
      const url = prompt("Enter URL:");
      if (url) exec("createLink", url);
    };

    const toolbarItems = compact
      ? [
          { icon: Bold, label: "Bold", action: () => exec("bold") },
          { icon: Italic, label: "Italic", action: () => exec("italic") },
          { icon: Underline, label: "Underline", action: () => exec("underline") },
          { icon: List, label: "Bullet List", action: () => exec("insertUnorderedList") },
          { icon: ListOrdered, label: "Numbered List", action: () => exec("insertOrderedList") },
        ]
      : [
          { icon: Bold, label: "Bold", action: () => exec("bold") },
          { icon: Italic, label: "Italic", action: () => exec("italic") },
          { icon: Underline, label: "Underline", action: () => exec("underline") },
          { icon: Strikethrough, label: "Strikethrough", action: () => exec("strikeThrough") },
          null,
          { icon: Heading1, label: "Heading 1", action: () => exec("formatBlock", "<h1>") },
          { icon: Heading2, label: "Heading 2", action: () => exec("formatBlock", "<h2>") },
          { icon: Heading3, label: "Heading 3", action: () => exec("formatBlock", "<h3>") },
          { icon: Type, label: "Paragraph", action: () => exec("formatBlock", "<p>") },
          null,
          { icon: List, label: "Bullet List", action: () => exec("insertUnorderedList") },
          { icon: ListOrdered, label: "Numbered List", action: () => exec("insertOrderedList") },
          null,
          { icon: AlignLeft, label: "Align Left", action: () => exec("justifyLeft") },
          { icon: AlignCenter, label: "Align Center", action: () => exec("justifyCenter") },
          { icon: AlignRight, label: "Align Right", action: () => exec("justifyRight") },
          null,
          { icon: Link, label: "Insert Link", action: insertLink },
          { icon: Undo, label: "Undo", action: () => exec("undo") },
          { icon: Redo, label: "Redo", action: () => exec("redo") },
        ];

    return (
      <div className={cn("border rounded-lg overflow-hidden bg-background", className)} ref={ref}>
        <div className="bg-secondary/30 px-2 py-1 flex items-center gap-0.5 border-b flex-wrap">
          {mode === "edit" && toolbarItems.map((item, i) =>
            item === null ? (
              <div key={i} className="w-px h-4 bg-border mx-1" />
            ) : (
              <ToolbarButton key={i} icon={item.icon} label={item.label} onAction={item.action} />
            )
          )}
          <div className="flex-1" />
          <div className="flex items-center border-l border-border pl-1 ml-1">
            <ToolbarButton
              icon={Pencil}
              label="Edit"
              onAction={() => setMode("edit")}
              active={mode === "edit"}
            />
            <ToolbarButton
              icon={Eye}
              label="Preview"
              onAction={() => setMode("preview")}
              active={mode === "preview"}
            />
          </div>
        </div>
        {mode === "edit" ? (
          <div
            ref={editorRef}
            contentEditable
            className={cn(
              "p-3 prose prose-sm dark:prose-invert max-w-none focus:outline-none",
              "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
            )}
            style={{ minHeight }}
            data-placeholder={placeholder || "Start typing..."}
            onInput={handleInput}
            onBlur={handleInput}
            onPaste={handlePaste}
          />
        ) : (
          <div
            className="p-3 prose prose-sm dark:prose-invert max-w-none"
            style={{ minHeight }}
            dangerouslySetInnerHTML={{ __html: value || `<p class="text-muted-foreground">No content to preview</p>` }}
          />
        )}
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";

export { RichTextEditor };
export type { RichTextEditorProps };
