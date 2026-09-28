import {
  Monitor, Smartphone, Globe, Terminal,
  Code2, MessageCircle, Zap, Palette, FileSpreadsheet, Play,
} from '../utils/icons'

// `short` is the label on the homepage filter chips; section headings keep the full name.
export const categoryConfig = {
  'macOS System':     { icon: Monitor,         color: '#1A1A1A', short: 'System' },
  'Apple Apps':       { icon: Smartphone,      color: '#1A1A1A' },
  'Browsers':         { icon: Globe,           color: '#1A1A1A' },
  'Development':      { icon: Code2,           color: '#1A1A1A' },
  'Communication':    { icon: MessageCircle,   color: '#1A1A1A' },
  'Productivity':     { icon: Zap,             color: '#1A1A1A' },
  'Design':           { icon: Palette,         color: '#1A1A1A' },
  'Microsoft Office': { icon: FileSpreadsheet, color: '#1A1A1A', short: 'Office' },
  'Media':            { icon: Play,            color: '#1A1A1A' },
  'Windows System':   { icon: Monitor,         color: '#1A1A1A', short: 'System' },
  'System Utils':     { icon: Terminal,        color: '#1A1A1A', short: 'Utilities' },
}
