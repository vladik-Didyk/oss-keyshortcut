// A stand-in for a Cloudflare D1 database, on the SQLite that Node carries.
// It has the four calls server/feedback.js uses: prepare, bind, first/all/run, batch.
import { DatabaseSync } from 'node:sqlite'

class Statement {
  constructor(db, sql, values = []) {
    this.db = db
    this.sql = sql
    this.values = values
  }
  bind(...values) {
    return new Statement(this.db, this.sql, values)
  }
  #reads() {
    return /^\s*(SELECT|WITH)/i.test(this.sql)
  }
  async all() {
    const statement = this.db.prepare(this.sql)
    if (this.#reads()) return { results: statement.all(...this.values).map((row) => ({ ...row })), success: true }
    statement.run(...this.values)
    return { results: [], success: true }
  }
  async first() {
    const row = this.db.prepare(this.sql).get(...this.values)
    return row ? { ...row } : null
  }
  async run() {
    return this.all()
  }
}

export function memoryDatabase() {
  const db = new DatabaseSync(':memory:')
  return {
    prepare: (sql) => new Statement(db, sql),
    batch: async (statements) => {
      const out = []
      for (const statement of statements) out.push(await statement.all())
      return out
    },
    // For the tests only: read what is stored. A table that was never made holds nothing.
    rows: (sql, ...values) => {
      try {
        return db.prepare(sql).all(...values).map((row) => ({ ...row }))
      } catch (error) {
        if (/no such table/.test(error.message)) return []
        throw error
      }
    },
  }
}
