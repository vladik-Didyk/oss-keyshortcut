import { useCallback, useEffect, useState } from 'react'
import { myVotes, sendVote, visitPage } from '../lib/feedback'

const NONE = { views: null, downloads: null, confirmed: null, items: {} }
const START = { enabled: false, numbers: NONE, mine: {} }

/**
 * Votes and counts of one app page.
 *
 *   enabled   false until the server says it keeps votes (it needs a database)
 *   numbers   { views, downloads, confirmed, items }: null or absent = not shown
 *   mine      the visitor's own votes, { <item>: 'works' | 'broken' }
 *   vote      (item, 'works' | 'broken') => sends it
 */
export function usePageFeedback(page) {
  const [state, setState] = useState(START)

  useEffect(() => {
    let live = true
    visitPage(page).then((answer) => {
      if (!live) return
      setState(answer.enabled ? { enabled: true, numbers: answer.numbers || NONE, mine: myVotes(page) } : START)
    })
    return () => {
      live = false
    }
  }, [page])

  const vote = useCallback(
    async (item, value) => {
      // The button answers at once; the numbers follow when the server has them.
      setState((now) => ({ ...now, mine: { ...now.mine, [item]: value } }))
      const answer = await sendVote(page, item, value)
      setState((now) => ({
        ...now,
        numbers: answer.numbers || now.numbers,
        mine: answer.status === 200 ? now.mine : myVotes(page),
      }))
      return answer
    },
    [page]
  )

  return { ...state, vote }
}
