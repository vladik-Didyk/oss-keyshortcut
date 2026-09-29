import { useCallback, useEffect, useState } from 'react'
import { countViewOnSign, myVotes, sendVote, visitPage, votesOn } from '../lib/feedback'

const NONE = { views: null, downloads: null, confirmed: null, items: {} }

/**
 * Votes and counts of one app page.
 *
 *   enabled   the switch is on (votesOn) and the server has not said that it
 *             keeps no votes. True from the first render, so the bar is in the
 *             page as it is served.
 *   numbers   { views, downloads, confirmed, items }: null or absent = not shown
 *   mine      the visitor's own votes, { <item>: 'works' | 'broken' }
 *   vote      (item, 'works' | 'broken') => sends it
 */
export function usePageFeedback(page) {
  const on = votesOn()
  const [state, setState] = useState({ enabled: on, numbers: NONE, mine: {} })

  useEffect(() => {
    if (!on) return
    let live = true
    let stopCounting = () => {}
    visitPage(page).then((answer) => {
      if (!live) return
      if (answer.enabled) stopCounting = countViewOnSign(page)
      setState(
        answer.enabled
          ? { enabled: true, numbers: answer.numbers || NONE, mine: myVotes(page) }
          : { enabled: false, numbers: NONE, mine: {} }
      )
    })
    return () => {
      live = false
      stopCounting()
    }
  }, [page, on])

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
