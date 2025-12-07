/**
 * Utility functions for rendering PayloadCMS Lexical richText content
 */

type LexicalNode = {
  type: string
  children?: LexicalNode[]
  text?: string
  format?: number
  style?: string
  url?: string
  [key: string]: unknown
}

/**
 * Recursively extract text content from Lexical nodes
 */
function extractTextFromNode(node: LexicalNode): string {
  if (node.text) {
    return node.text
  }

  if (node.children) {
    return node.children.map(extractTextFromNode).join('')
  }

  return ''
}

/**
 * Extract plain text from Lexical richText content
 * For MVP, this provides basic text extraction
 * TODO: Enhance with full HTML rendering using PayloadCMS React Renderer
 */
export function extractTextFromLexical(
  lexicalContent: unknown
): string {
  if (!lexicalContent) {
    return ''
  }

  if (typeof lexicalContent === 'string') {
    return lexicalContent
  }

  if (typeof lexicalContent === 'object' && lexicalContent !== null) {
    const node = lexicalContent as LexicalNode & { root?: LexicalNode }

    if (node.root && 'children' in node.root && Array.isArray(node.root.children)) {
      return node.root.children.map(extractTextFromNode).join(' ')
    }

    if (node.children && Array.isArray(node.children)) {
      return node.children.map(extractTextFromNode).join(' ')
    }

    if (Array.isArray(lexicalContent)) {
      return lexicalContent
        .map((item) => extractTextFromLexical(item))
        .join(' ')
    }
  }

  return ''
}

/**
 * Render Lexical content as HTML (basic implementation)
 * For MVP, converts to simple HTML structure
 * TODO: Use PayloadCMS React Renderer for full feature support
 */
export function renderLexicalAsHTML(
  lexicalContent: unknown
): string {
  if (!lexicalContent) {
    return ''
  }

  // For MVP, return extracted text wrapped in paragraph
  // Full HTML rendering can be added later with PayloadCMS React Renderer
  const text = extractTextFromLexical(lexicalContent)
  return text ? `<p>${text}</p>` : ''
}

