/**
 * Serves the map editor and writes what you place back into campus.layout.ts.
 *
 *   npm run map:edit      →  http://localhost:5174
 *
 * The editor is the authority on layout: this process only reads the current
 * layout, serves static files, and rewrites campus.layout.ts on save. It never
 * touches campus.ts, which owns the types and the derived scenery.
 */

import { createServer } from 'node:http'
import { readFile, writeFile, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const layoutPath = join(here, '..', '..', 'src', 'game', 'campus.layout.ts')
const PORT = 5174

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
}

const HEADER = `/**
 * Campus layout — PURE DATE, fără logică.
 *
 * ACEST FIȘIER ESTE GENERAT DE EDITORUL DE HARTĂ.
 * Nu-l edita de mână dacă poți evita: rulează \`npm run map:edit\`, mută ce vrei
 * cu mouse-ul peste fotografia aeriană, apasă Salvează. Editorul rescrie fix
 * acest fișier și nimic altceva.
 *
 * Tipurile, valorile derivate (copaci, lămpi, bănci) și restul logicii stau în
 * campus.ts, care importă de aici.
 */

export const LAYOUT = `

/** Reads the layout by evaluating just the object literal — no import needed. */
async function readLayout() {
  const source = await readFile(layoutPath, 'utf8')
  const start = source.indexOf('export const LAYOUT =')
  if (start === -1) throw new Error('campus.layout.ts: missing "export const LAYOUT ="')
  const body = source.slice(start + 'export const LAYOUT ='.length).trim()
  return JSON.parse(body)
}

function sendJson(response: import('node:http').ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(payload)
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`)

  try {
    if (url.pathname === '/api/layout' && request.method === 'GET') {
      sendJson(response, 200, await readLayout())
      return
    }

    if (url.pathname === '/api/layout' && request.method === 'POST') {
      const chunks: Buffer[] = []
      for await (const chunk of request) chunks.push(chunk as Buffer)
      const layout = JSON.parse(Buffer.concat(chunks).toString('utf8'))

      // A layout is cheap to redo but annoying to lose, so keep one step back.
      if (existsSync(layoutPath)) {
        await copyFile(layoutPath, layoutPath + '.bak')
      }
      await writeFile(layoutPath, HEADER + JSON.stringify(layout, null, 2) + '\n', 'utf8')

      console.log(
        `salvat: ${layout.buildings.length} clădiri, ${layout.zones.length} zone, ` +
          `${layout.stands.length} standuri, ${layout.roads.length} drumuri`,
      )
      sendJson(response, 200, { ok: true })
      return
    }

    const name = url.pathname === '/' ? '/editor.html' : url.pathname
    const filePath = join(here, name.replace(/^\/+/, ''))
    if (!filePath.startsWith(here)) {
      response.writeHead(403).end('nope')
      return
    }

    const file = await readFile(filePath)
    response.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    response.end(file)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      response.writeHead(404).end('not found')
      return
    }
    console.error(message)
    sendJson(response, 500, { error: message })
  }
})

// Starting a second editor is an easy mistake and the raw EADDRINUSE trace says
// nothing useful. The one already listening serves these same files from disk on
// every request, so the answer is almost always "just open it".
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code !== 'EADDRINUSE') throw error

  console.error(`\n  Portul ${PORT} e deja ocupat — ai un editor pornit.`)
  console.error(`  Deschide-l:  http://localhost:${PORT}`)
  console.error('  Serveste fisierele de pe disc la fiecare cerere, deci e la zi;')
  console.error('  daca pagina e deja deschisa, un refresh e de ajuns.\n')
  console.error('  Daca vrei totusi unul nou, opreste-l intai:')
  console.error(`    Get-NetTCPConnection -LocalPort ${PORT} -State Listen |`)
  console.error('      Select-Object -ExpandProperty OwningProcess -Unique | Stop-Process -Force\n')
  process.exit(1)
})

server.listen(PORT, () => {
  console.log(`\n  Editor de hartă:  http://localhost:${PORT}\n`)
  console.log(`  scrie în: ${layoutPath}`)
  console.log('  Ctrl+C ca să închizi.\n')
})
