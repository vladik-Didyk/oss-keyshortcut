import MacAppStoreButton from './MacAppStoreButton'
import { formatShortcutCount, MAC_APP_COUNT, MAC_SHORTCUT_COUNT } from '../data/siteConfig'

export default function GuideCtaBanner() {
  return (
    <div className="rounded-2xl bg-theme-accent p-8 md:p-10 text-center my-10">
      <h3 className="text-2xl font-bold text-theme-accent-text mb-3">
        Stop looking up shortcuts
      </h3>
      <p className="text-theme-accent-text/80 mb-6 max-w-md mx-auto">
        KeyShortcut shows {formatShortcutCount(MAC_SHORTCUT_COUNT)} shortcuts for {MAC_APP_COUNT} apps
        in a floating panel that detects your active app automatically.
      </p>
      <MacAppStoreButton />
    </div>
  )
}
