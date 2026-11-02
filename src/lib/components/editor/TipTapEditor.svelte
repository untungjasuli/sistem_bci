<script>
    import { onMount, onDestroy } from 'svelte';
    import { Editor, Extension, mergeAttributes } from '@tiptap/core';
    import StarterKit from '@tiptap/starter-kit';
    import Placeholder from '@tiptap/extension-placeholder';
    import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
    import TextAlign from '@tiptap/extension-text-align';

    let {
        content = '',
        placeholder = 'Ketik template surat di sini...',
        onChange,
        readonly = false,
        editorClass = 'min-h-[300px] border border-gray-300 rounded-lg bg-white',
        onReady
    } = $props();

    let editor = $state(null);
    let editorElement = $state(null);
    let toolbarElement = $state(null);
    let isInitialized = $state(false);
    let isClient = $state(false);

    // Toolbar state
    let showTableMenu = $state(false);
    let selectedHeading = $state('');
    let isFullscreen = $state(false);

    // Extend TableCell to allow all attributes (for colspan, rowspan, style, etc.)
    const ExtendedTableCell = TableCell.extend({
        addAttributes() {
            return {
                colspan: { default: 1, parseHTML: (el) => parseInt(el.getAttribute('colspan') || '1', 10), renderHTML: (attrs) => attrs.colspan > 1 ? { colspan: attrs.colspan } : {} },
                rowspan: { default: 1, parseHTML: (el) => parseInt(el.getAttribute('rowspan') || '1', 10), renderHTML: (attrs) => attrs.rowspan > 1 ? { rowspan: attrs.rowspan } : {} },
                style: { default: null, parseHTML: (el) => el.getAttribute('style'), renderHTML: (attrs) => attrs.style ? { style: attrs.style } : {} },
                class: { default: null, parseHTML: (el) => el.getAttribute('class'), renderHTML: (attrs) => attrs.class ? { class: attrs.class } : {} }
            };
        }
    });

    // Extend TableRow for style/class support
    const ExtendedTableRow = TableRow.extend({
        addAttributes() {
            return {
                style: { default: null, parseHTML: (el) => el.getAttribute('style'), renderHTML: (attrs) => attrs.style ? { style: attrs.style } : {} },
                class: { default: null, parseHTML: (el) => el.getAttribute('class'), renderHTML: (attrs) => attrs.class ? { class: attrs.class } : {} }
            };
        }
    });

    // Extend Table for style/class support
    const ExtendedTable = Table.extend({
        addAttributes() {
            return {
                style: { default: null, parseHTML: (el) => el.getAttribute('style'), renderHTML: (attrs) => attrs.style ? { style: attrs.style } : {} },
                class: { default: null, parseHTML: (el) => el.getAttribute('class'), renderHTML: (attrs) => attrs.class ? { class: attrs.class } : {} }
            };
        }
    });

    // Custom extension to allow all HTML tags (including div, span with custom attrs)
    const AllowAllTags = Extension.create({
        name: 'allowAllTags',
        addOptions() { return { allowedTags: [] }; },
        addGlobalAttributes() {
            return [
                {
                    types: ['textStyle'],
                    attributes: {
                        style: { default: null, parseHTML: (el) => el.getAttribute('style'), renderHTML: (attrs) => attrs.style ? { style: attrs.style } : {} },
                        class: { default: null, parseHTML: (el) => el.getAttribute('class'), renderHTML: (attrs) => attrs.class ? { class: attrs.class } : {} }
                    }
                }
            ];
        }
    });

    async function initEditor() {
        if (isInitialized || !editorElement || !isClient) return;

        const editorInstance = new Editor({
            element: editorElement,
            editorProps: {
                attributes: {
                    class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4'
                }
            },
            extensions: [
                StarterKit.configure({
                    codeBlock: { HTMLAttributes: { class: 'bg-gray-100 p-2 rounded' } }
                }),
                Placeholder.configure({ placeholder, emptyEditorClass: 'is-editor-empty' }),
                TextAlign.configure({ types: ['heading', 'paragraph'] }),
                ExtendedTable,
                ExtendedTableRow,
                ExtendedTableCell,
                TableHeader,
                AllowAllTags.configure({ allowedTags: ['div', 'span', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'figure', 'figcaption'] })
            ],
            content: content || '',
            editable: !readonly,
            onUpdate: ({ editor }) => {
                if (onChange && isInitialized) onChange(editor.getHTML());
            },
            parseOptions: {
                preserveWhitespace: 'full'
            }
        });

        editor = editorInstance;
        isInitialized = true;

        // Notify parent when editor is ready
        if (onReady) {
            onReady({ getHTML, setHTML, focus, insertVariable });
        }
    }

    // Initialize only on client side
    onMount(() => {
        isClient = true;
        if (editorElement && !isInitialized) {
            initEditor();
        }
    });

    // Update content when prop changes (external updates) - only after init
    $effect(() => {
        if (isClient && editor && isInitialized && editor.getHTML() !== content) {
            editor.commands.setContent(content || '', false);
        }
    });

    // Cleanup
    onDestroy(() => {
        if (editor) {
            editor.destroy();
            editor = null;
            isInitialized = false;
        }
    });

    // Toolbar actions
    function setHeading(level) {
        editor?.commands.focus();
        editor?.commands.setHeading({ level });
    }

    function setParagraph() {
        editor?.commands.focus();
        editor?.commands.setParagraph();
    }

    function toggleBold() {
        editor?.commands.focus();
        editor?.commands.toggleBold();
    }

    function toggleItalic() {
        editor?.commands.focus();
        editor?.commands.toggleItalic();
    }

    function toggleStrike() {
        editor?.commands.focus();
        editor?.commands.toggleStrike();
    }

    function toggleUnderline() {
        editor?.commands.focus();
        editor?.commands.toggleUnderline();
    }

    function toggleCode() {
        editor?.commands.focus();
        editor?.commands.toggleCode();
    }

    function toggleBulletList() {
        editor?.commands.focus();
        editor?.commands.toggleBulletList();
    }

    function toggleOrderedList() {
        editor?.commands.focus();
        editor?.commands.toggleOrderedList();
    }

    // Text alignment
    function setTextAlign(align) {
        editor?.commands.focus();
        editor?.commands.setTextAlign(align);
    }

    function toggleBlockquote() {
        editor?.commands.focus();
        editor?.commands.toggleBlockquote();
    }

    function toggleCodeBlock() {
        editor?.commands.focus();
        editor?.commands.toggleCodeBlock();
    }

    function addTable() {
        editor?.commands.focus();
        editor?.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
        showTableMenu = false;
    }

    function addRowBefore() {
        editor?.commands.focus();
        editor?.commands.addRowBefore();
    }

    function addRowAfter() {
        editor?.commands.focus();
        editor?.commands.addRowAfter();
    }

    function deleteRow() {
        editor?.commands.focus();
        editor?.commands.deleteRow();
    }

    function addColumnBefore() {
        editor?.commands.focus();
        editor?.commands.addColumnBefore();
    }

    function addColumnAfter() {
        editor?.commands.focus();
        editor?.commands.addColumnAfter();
    }

    function deleteColumn() {
        editor?.commands.focus();
        editor?.commands.deleteColumn();
    }

    function deleteTable() {
        editor?.commands.focus();
        editor?.commands.deleteTable();
        showTableMenu = false;
    }

    function toggleTableMenu() {
        showTableMenu = !showTableMenu;
    }

    function toggleFullscreen() {
        isFullscreen = !isFullscreen;
        // Focus editor after toggle
        editor?.commands.focus();
    }

    function insertVariable(key) {
        editor?.commands.insertContent(`{{${key}}}`);
    }

    // Expose methods for parent component
    function getHTML() {
        return editor?.getHTML() || '';
    }

    function setHTML(html) {
        editor?.commands.setContent(html || '', false);
    }

    function focus() {
        editor?.commands.focus();
    }
</script>

<!-- Editor Container -->
<div class="tiptap-editor-container border border-gray-300 rounded-lg bg-white overflow-hidden" class:fullscreen={isFullscreen}>
    <!-- Toolbar -->
    <div class="tiptap-toolbar border-b border-gray-300 bg-gray-50 p-2 flex flex-wrap gap-1" bind:this={toolbarElement}>
    <!-- Headings -->
    <div class="flex items-center gap-1 border-r border-gray-300 pr-2">
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={setParagraph} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors text-xs font-medium" title="Paragraph">P</button>
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => setHeading(1)} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors text-xs font-bold" title="Heading 1">H1</button>
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => setHeading(2)} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors text-xs font-bold" title="Heading 2">H2</button>
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => setHeading(3)} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors text-xs font-bold" title="Heading 3">H3</button>
    </div>

    <!-- Text formatting -->
    <div class="flex items-center gap-1 border-r border-gray-300 pr-2">
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={toggleBold} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors font-bold" title="Bold (Ctrl+B)"><i class="fa-solid fa-bold"></i></button>
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={toggleItalic} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors italic" title="Italic (Ctrl+I)"><i class="fa-solid fa-italic"></i></button>
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={toggleUnderline} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors underline" title="Underline (Ctrl+U)"><i class="fa-solid fa-underline"></i></button>
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={toggleStrike} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors line-through" title="Strikethrough"><i class="fa-solid fa-strikethrough"></i></button>
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={toggleCode} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors font-mono text-xs" title="Inline Code"><i class="fa-solid fa-code"></i></button>
    </div>

    <!-- Lists -->
    <div class="flex items-center gap-1 border-r border-gray-300 pr-2">
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={toggleBulletList} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors" title="Bullet List"><i class="fa-solid fa-list"></i></button>
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={toggleOrderedList} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors" title="Numbered List"><i class="fa-solid fa-list-ol"></i></button>
    </div>

    <!-- Text Alignment -->
    <div class="flex items-center gap-1 border-r border-gray-300 pr-2">
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => setTextAlign('left')} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors" title="Align Left"><i class="fa-solid fa-align-left"></i></button>
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => setTextAlign('center')} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors" title="Align Center"><i class="fa-solid fa-align-center"></i></button>
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => setTextAlign('right')} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors" title="Align Right"><i class="fa-solid fa-align-right"></i></button>
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => setTextAlign('justify')} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors" title="Justify"><i class="fa-solid fa-align-justify"></i></button>
    </div>

    <!-- Blocks -->
    <div class="flex items-center gap-1 border-r border-gray-300 pr-2">
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={toggleBlockquote} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors" title="Quote"><i class="fa-solid fa-quote-left"></i></button>
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={toggleCodeBlock} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors" title="Code Block"><i class="fa-solid fa-terminal"></i></button>
    </div>

    <!-- Table -->
    <div class="flex items-center gap-1 relative">
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={toggleTableMenu} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors" title="Table"><i class="fa-solid fa-table"></i></button>
        
        {#if showTableMenu}
        <div class="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[160px] z-20">
            <button type="button" onmousedown={(e) => e.preventDefault()} onclick={addTable} class="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100">Insert Table (3x3)</button>
            <hr class="my-1 border-gray-200" />
            <button type="button" onmousedown={(e) => e.preventDefault()} onclick={addRowBefore} class="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100">Add Row Before</button>
            <button type="button" onmousedown={(e) => e.preventDefault()} onclick={addRowAfter} class="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100">Add Row After</button>
            <button type="button" onmousedown={(e) => e.preventDefault()} onclick={deleteRow} class="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 text-red-600">Delete Row</button>
            <hr class="my-1 border-gray-200" />
            <button type="button" onmousedown={(e) => e.preventDefault()} onclick={addColumnBefore} class="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100">Add Column Before</button>
            <button type="button" onmousedown={(e) => e.preventDefault()} onclick={addColumnAfter} class="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100">Add Column After</button>
            <button type="button" onmousedown={(e) => e.preventDefault()} onclick={deleteColumn} class="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 text-red-600">Delete Column</button>
            <hr class="my-1 border-gray-200" />
            <button type="button" onmousedown={(e) => e.preventDefault()} onclick={deleteTable} class="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50">Delete Table</button>
        </div>
        {/if}
    </div>

    <!-- Spacer -->
    <div class="flex-1"></div>

    <!-- Fullscreen -->
    <div class="flex items-center gap-1">
        <button type="button" onmousedown={(e) => e.preventDefault()} onclick={toggleFullscreen} class="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors" title="Fullscreen">
            {#if isFullscreen}
                <i class="fa-solid fa-compress"></i>
            {:else}
                <i class="fa-solid fa-expand"></i>
            {/if}
        </button>
    </div>

    <!-- Variable hint -->
    <div class="flex items-center gap-1 text-xs text-gray-500 px-2">
        <i class="fa-solid fa-info-circle"></i>
        <span>{'Gunakan panel kanan untuk sisipkan {{variabel}'}</span>
    </div>
</div>

<!-- Editor -->
<div
    bind:this={editorElement}
    class={isFullscreen ? 'flex-1 min-h-0' : editorClass}
    data-tiptap-editor="true"
></div>
</div>

<style>
    /* Toolbar styles */
    :global(.tiptap-toolbar) {
        @apply border border-gray-300 rounded-t-lg bg-gray-50 p-2 flex flex-wrap gap-1;
    }

    :global(.tiptap-toolbar button) {
        @apply p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors;
    }

    :global(.tiptap-toolbar select) {
        @apply text-xs px-2 py-1 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer;
    }

    /* TipTap editor styles */
    :global(.ProseMirror) {
        outline: none;
        min-height: 300px;
        line-height: 1.6;
    }

    :global(.ProseMirror p.is-editor-empty:first-child::before) {
        color: #9ca3af;
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
    }

    /* Heading styles */
    :global(.ProseMirror h1) {
        font-size: 2rem;
        font-weight: 700;
        line-height: 1.3;
        margin: 1.5rem 0 0.75rem;
        color: #111827;
    }

    :global(.ProseMirror h2) {
        font-size: 1.5rem;
        font-weight: 600;
        line-height: 1.4;
        margin: 1.25rem 0 0.5rem;
        color: #1f2937;
    }

    :global(.ProseMirror h3) {
        font-size: 1.25rem;
        font-weight: 600;
        line-height: 1.4;
        margin: 1rem 0 0.5rem;
        color: #374151;
    }

    /* Paragraph */
    :global(.ProseMirror p) {
        margin: 0.5rem 0;
    }

    /* List styles */
    :global(.ProseMirror ul) {
        list-style-type: disc;
        padding-left: 1.5rem;
        margin: 0.5rem 0;
    }

    :global(.ProseMirror ol) {
        list-style-type: decimal;
        padding-left: 1.5rem;
        margin: 0.5rem 0;
    }

    :global(.ProseMirror li) {
        margin: 0.25rem 0;
        line-height: 1.6;
    }

    :global(.ProseMirror li p) {
        margin: 0;
        display: inline;
    }

    /* Nested lists */
    :global(.ProseMirror ul ul) {
        list-style-type: circle;
    }

    :global(.ProseMirror ul ul ul) {
        list-style-type: square;
    }

    :global(.ProseMirror ol ol) {
        list-style-type: lower-alpha;
    }

    :global(.ProseMirror ol ol ol) {
        list-style-type: lower-roman;
    }

    /* Blockquote */
    :global(.ProseMirror blockquote) {
        border-left: 3px solid #3b82f6;
        padding-left: 1rem;
        margin: 1rem 0;
        font-style: italic;
        color: #4b5563;
        background-color: #f9fafb;
        padding: 0.75rem 1rem;
        border-radius: 0 0.375rem 0.375rem 0;
    }

    /* Code block */
    :global(.ProseMirror pre) {
        background: #1f2937;
        color: #e5e7eb;
        padding: 1rem;
        border-radius: 0.375rem;
        overflow-x: auto;
        margin: 1rem 0;
    }

    :global(.ProseMirror pre code) {
        background: none;
        padding: 0;
        font-size: 0.875rem;
        line-height: 1.7;
    }

    :global(.ProseMirror code) {
        background: #f3f4f6;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        font-family: monospace;
    }

    :global(.ProseMirror pre code::before),
    :global(.ProseMirror pre code::after) {
        content: none;
    }

    :global(.ProseMirror table) {
        border-collapse: collapse;
        margin: 1rem 0;
        width: 100%;
        table-layout: fixed;
    }

    :global(.ProseMirror td, .ProseMirror th) {
        border: 1px solid #d1d5db;
        padding: 0.5rem;
        vertical-align: top;
        min-width: 60px;
    }

    :global(.ProseMirror th) {
        background-color: #f3f4f6;
        font-weight: 600;
    }

    :global(.ProseMirror .selectedCell:after) {
        background: #3b82f633;
        content: '';
        position: absolute;
        top: 0; right: 0; bottom: 0; left: 0;
        pointer-events: none;
    }

    :global(.ProseMirror .column-resize-handle) {
        background: #3b82f6;
        bottom: -2px;
        position: absolute;
        right: -2px;
        top: 0;
        width: 4px;
        z-index: 20;
    }

    /* Allow all HTML tags to render properly */
    :global(.ProseMirror div, .ProseMirror span, .ProseMirror section, .ProseMirror article) {
        display: block;
    }

    :global(.ProseMirror span) {
        display: inline;
    }

    /* Ensure div tags inside editor render as blocks */
    :global(.ProseMirror div[style*="display"]) {
        display: block !important;
    }

    /* Dropdown menu */
    :global(.tiptap-dropdown) {
        @apply absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[160px] z-20;
    }

    :global(.tiptap-dropdown button) {
        @apply w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100;
    }

    :global(.tiptap-dropdown hr) {
        @apply my-1 border-gray-200;
    }

    /* Fullscreen mode */
    :global(.tiptap-editor-container.fullscreen) {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 9999;
        background: white;
        border-radius: 0;
        border: none;
        display: flex;
        flex-direction: column;
    }

    :global(.tiptap-editor-container.fullscreen .tiptap-toolbar) {
        border-radius: 0;
        border-bottom: 1px solid #d1d5db;
        position: sticky;
        top: 0;
        z-index: 10;
        flex-shrink: 0;
    }

    :global(.tiptap-editor-container.fullscreen > div[class*="flex-1"]) {
        flex: 1;
        overflow: auto;
        min-height: 0;
        padding: 2rem;
        max-width: 900px;
        margin: 0 auto;
        width: 100%;
        box-sizing: border-box;
    }

    :global(.tiptap-editor-container.fullscreen > div[class*="flex-1"] > .ProseMirror) {
        min-height: 100%;
        height: auto;
    }

    :global(.tiptap-editor-container.fullscreen > div[class*="flex-1"] .ProseMirror > *) {
        max-width: 100%;
    }
</style>