// Cloudflare Pages Function. The rules are in server/feedback.js.
import { download } from '../../server/feedback.js'

export const onRequestPost = (context) => download(context)
