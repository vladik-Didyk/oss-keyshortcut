// Cloudflare Pages Function. The rules are in server/feedback.js.
import { visit } from '../../server/feedback.js'

export const onRequestPost = (context) => visit(context)
