import { Code2, Image, Link2, Palette, Pin, Text, Trash2 } from 'lucide-react'

import type { ClipboardItemView, ClipKind } from '../../../shared/contracts'

interface ClipRowProps {
  item: ClipboardItemView
  selected: boolean
  relativeTime: string
  onSelect: () => void
  onCopy: () => void
  onTogglePin: () => void
  onDelete: () => void
}

const KIND_LABELS: Record<ClipKind, string> = {
  text: 'Text',
  link: 'Link',
  code: 'Code',
  color: 'Color',
  image: 'Image'
}

function TypeIcon({ kind }: { kind: ClipKind }): React.JSX.Element {
  const props = { size: 17, strokeWidth: 1.9, 'aria-hidden': true } as const
  if (kind === 'link') return <Link2 {...props} />
  if (kind === 'code') return <Code2 {...props} />
  if (kind === 'color') return <Palette {...props} />
  if (kind === 'image') return <Image {...props} />
  return <Text {...props} />
}

export function ClipRow({
  item,
  selected,
  relativeTime,
  onSelect,
  onCopy,
  onTogglePin,
  onDelete
}: ClipRowProps): React.JSX.Element {
  return (
    <div
      className={`clip-row clip-row--${item.kind}${selected ? ' is-selected' : ''}`}
      role="option"
      aria-selected={selected}
      aria-label={`${item.preview}, ${KIND_LABELS[item.kind]}, ${item.sourceApp}, ${relativeTime}. Click to copy.`}
      data-clip-id={item.id}
      onMouseEnter={onSelect}
      onClick={onCopy}
    >
      {item.kind === 'image' && item.thumbnailDataUrl ? (
        <img className="clip-thumbnail" src={item.thumbnailDataUrl} alt="Clipboard preview" />
      ) : item.kind === 'color' && item.colorValue ? (
        <span
          className="color-swatch"
          style={{ backgroundColor: item.colorValue }}
          aria-hidden="true"
        />
      ) : (
        <span className="type-icon" aria-label={KIND_LABELS[item.kind]}>
          <TypeIcon kind={item.kind} />
        </span>
      )}

      <div className="clip-copy">
        <div
          className={`clip-preview${item.kind === 'code' ? ' clip-preview--code' : ''}`}
          title={item.preview}
        >
          {item.preview || 'Empty text'}
        </div>
        <div className="clip-meta">
          <span>{KIND_LABELS[item.kind]}</span>
          <span aria-hidden="true">·</span>
          <span className="clip-source">{item.sourceApp}</span>
          {item.pinned ? (
            <span className="pinned-label">
              <Pin size={10} fill="currentColor" aria-hidden="true" /> Pinned
            </span>
          ) : null}
        </div>
      </div>

      <time className="clip-time" dateTime={new Date(item.copiedAt).toISOString()}>
        {relativeTime}
      </time>

      <div className="row-actions">
        <button
          className="icon-button row-action"
          type="button"
          aria-label={item.pinned ? 'Unpin item' : 'Pin item'}
          title={item.pinned ? 'Unpin' : 'Pin'}
          onClick={(event) => {
            event.stopPropagation()
            onTogglePin()
          }}
        >
          <Pin size={15} fill={item.pinned ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        <button
          className="icon-button row-action row-action--danger"
          type="button"
          aria-label="Delete item"
          title="Delete"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
