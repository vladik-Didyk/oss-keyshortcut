// Cloudflare Pages Function. The rules are in server/feedback.js.
import { vote } from '../../server/feedback.js'

export const onRequestPost = (context) => vote(context)
