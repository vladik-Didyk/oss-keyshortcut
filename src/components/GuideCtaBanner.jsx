import MacAppStoreButton from './MacAppStoreButton'
import { formatShortcutCount, MAC_APP_COUNT, MAC_SHORTCUT_COUNT } from '../data/siteConfig'

// Active app detection is off by default, so the banner says where to switch
// it on. A guide shows the banner more than once; settingsNote={false} leaves
// the sentence to the banner that closes the page.
export default function GuideCtaBanner({ settingsNote = true }) {
  return (
    <div className="rounded-2xl bg-theme-accent p-8 md:p-10 text-center my-10">
      <h3 className="text-2xl font-bold text-theme-accent-text mb-3">
        Stop looking up shortcuts
      </h3>
      <p className="text-theme-accent-text/80 mb-6 max-w-md mx-auto">
        KeyShortcut shows {formatShortcutCount(MAC_SHORTCUT_COUNT)} shortcuts for {MAC_APP_COUNT} apps
        in a floating panel. Active app detection shows the shortcuts of the app you are using.
        {settingsNote && ' Switch it on in Settings.'}
      </p>
      <MacAppStoreButton />
    </div>
  )
}
