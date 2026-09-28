import Phaser from 'phaser'
import { STANDS, type StandId } from '../campus'
import { STAND_COLORS, toNumber } from '../palette'
import { COOLDOWN_MS, TRIVIA } from '../trivia'
import type { GameBridge, GameState } from '../bridge'
import type { WorldScene } from './WorldScene'

const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif'

/**
 * Answers map straight onto the D-pad, because the action button is reserved
 * for leaving the screen - there is no separate confirm button to press. Each
 * row shows its glyph so the mapping never has to be explained.
 */
const DIRECTIONS = ['up', 'right', 'down', 'left'] as const
const GLYPHS = ['▲', '▶', '▼', '◀']
const DIRECTION_NAMES = ['SUS', 'DREAPTA', 'JOS', 'STÂNGA']

type RowState = 'idle' | 'wrong' | 'correct'

type SceneData = { standId: StandId }

const CARD_X = 190
const CARD_WIDTH = 900
const ROW_X = 222
const ROW_WIDTH = 836
const ROW_HEIGHT = 66
const ROW_GAP = 11
const ROWS_TOP = 252

export class TriviaScene extends Phaser.Scene {
  private bridge!: GameBridge
  private state!: GameState
  private standId!: StandId

  private rowGraphics!: Phaser.GameObjects.Graphics
  private rowTexts: Phaser.GameObjects.Text[] = []
  private glyphTexts: Phaser.GameObjects.Text[] = []
  private statusText!: Phaser.GameObjects.Text
  private hintBox!: Phaser.GameObjects.Container
  private hintText!: Phaser.GameObjects.Text
  private solvedOnOpen = false

  constructor() {
    super('trivia')
  }

  init(data: SceneData) {
    this.bridge = this.registry.get('bridge') as GameBridge
    this.state = this.registry.get('state') as GameState
    this.standId = data.standId
    this.rowTexts = []
    this.glyphTexts = []
  }

  create() {
    const width = this.scale.width
    const height = this.scale.height
    const stand = STANDS.find((entry) => entry.id === this.standId)
    const question = TRIVIA[this.standId]
    const progress = this.state.get(this.standId)
    this.solvedOnOpen = progress.solved

    const accent = toNumber(STAND_COLORS[stand?.color ?? 0])

    this.add.rectangle(0, 0, width, height, 0x120f1a, 0.72).setOrigin(0, 0)

    const card = this.add.graphics()
    card.fillStyle(0x241f33, 0.99)
    card.fillRoundedRect(CARD_X, 46, CARD_WIDTH, 648, 26)
    card.lineStyle(5, accent, 1)
    card.strokeRoundedRect(CARD_X, 46, CARD_WIDTH, 648, 26)
    card.fillStyle(accent, 1)
    card.fillRoundedRect(CARD_X, 46, CARD_WIDTH, 64, 26)
    card.fillRect(CARD_X, 92, CARD_WIDTH, 18)

    this.add
      .text(CARD_X + 28, 78, stand?.label ?? 'Stand OSUT', {
        fontFamily: FONT,
        fontSize: '24px',
        fontStyle: '800',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5)

    this.add
      .text(CARD_X + CARD_WIDTH - 28, 78, `${this.state.medals} / ${this.state.targetMedals} medalii`, {
        fontFamily: FONT,
        fontSize: '20px',
        fontStyle: '700',
        color: '#ffffff',
      })
      .setOrigin(1, 0.5)

    this.add.text(CARD_X + 32, 138, question.question, {
      fontFamily: FONT,
      fontSize: '26px',
      fontStyle: '700',
      color: '#f6f1ff',
      wordWrap: { width: CARD_WIDTH - 64 },
      lineSpacing: 6,
    })

    this.rowGraphics = this.add.graphics()

    question.answers.forEach((answer, index) => {
      const y = ROWS_TOP + index * (ROW_HEIGHT + ROW_GAP)

      this.glyphTexts.push(
        this.add
          .text(ROW_X + 40, y + ROW_HEIGHT / 2, GLYPHS[index], {
            fontFamily: FONT,
            fontSize: '26px',
            fontStyle: '800',
            color: '#ffffff',
          })
          .setOrigin(0.5),
      )

      this.add
        .text(ROW_X + 40, y + ROW_HEIGHT - 12, DIRECTION_NAMES[index], {
          fontFamily: FONT,
          fontSize: '10px',
          fontStyle: '800',
          color: '#b9b3cc',
        })
        .setOrigin(0.5, 1)

      this.add
        .text(ROW_X + 86, y + ROW_HEIGHT / 2, `${index + 1}.`, {
          fontFamily: FONT,
          fontSize: '22px',
          fontStyle: '800',
          color: '#9f98b8',
        })
        .setOrigin(0, 0.5)

      this.rowTexts.push(
        this.add
          .text(ROW_X + 126, y + ROW_HEIGHT / 2, answer, {
            fontFamily: FONT,
            fontSize: '21px',
            fontStyle: '600',
            color: '#f4f0ff',
            wordWrap: { width: ROW_WIDTH - 160 },
          })
          .setOrigin(0, 0.5),
      )
    })

    this.statusText = this.add
      .text(this.scale.width / 2, 640, '', {
        fontFamily: FONT,
        fontSize: '20px',
        fontStyle: '700',
        color: '#ffd489',
      })
      .setOrigin(0.5)

    this.buildHintBox(accent)

    this.add
      .text(this.scale.width / 2, 670, 'ACȚIUNE · înapoi la hartă', {
        fontFamily: FONT,
        fontSize: '18px',
        fontStyle: '700',
        color: '#b9b3cc',
      })
      .setOrigin(0.5)

    this.redraw()

    this.cameras.main.setAlpha(0)
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 180 })
  }

  private buildHintBox(accent: number) {
    const background = this.add.graphics()
    background.fillStyle(0x191428, 1)
    background.fillRoundedRect(0, 0, CARD_WIDTH - 64, 62, 14)
    background.lineStyle(3, accent, 0.8)
    background.strokeRoundedRect(0, 0, CARD_WIDTH - 64, 62, 14)

    const label = this.add.text(18, 10, 'INDICIU', {
      fontFamily: FONT,
      fontSize: '13px',
      fontStyle: '800',
      color: '#ffd489',
    })

    this.hintText = this.add.text(18, 30, '', {
      fontFamily: FONT,
      fontSize: '17px',
      fontStyle: '600',
      color: '#e6e1f5',
      wordWrap: { width: CARD_WIDTH - 104 },
    })

    this.hintBox = this.add
      .container(CARD_X + 32, 556, [background, label, this.hintText])
      .setVisible(false)
  }

  private rowState(index: number): RowState {
    const progress = this.state.get(this.standId)
    const question = TRIVIA[this.standId]
    if (progress.solved && index === question.correct) {
      return 'correct'
    }
    if (progress.wrongAnswers.has(index)) {
      return 'wrong'
    }
    return 'idle'
  }

  private redraw() {
    const progress = this.state.get(this.standId)
    const question = TRIVIA[this.standId]

    this.rowGraphics.clear()

    for (let index = 0; index < 4; index += 1) {
      const y = ROWS_TOP + index * (ROW_HEIGHT + ROW_GAP)
      const state = this.rowState(index)

      let fill = 0x322b47
      let stroke = 0x554d70
      let textColor = '#f4f0ff'

      if (state === 'wrong') {
        fill = 0x6d1f2e
        stroke = 0xff6b6b
        textColor = '#ffc9c9'
      } else if (state === 'correct') {
        fill = 0x1c6b47
        stroke = 0x6ee7a0
        textColor = '#d6ffe8'
      }

      this.rowGraphics.fillStyle(fill, 1)
      this.rowGraphics.fillRoundedRect(ROW_X, y, ROW_WIDTH, ROW_HEIGHT, 14)
      this.rowGraphics.lineStyle(3, stroke, 1)
      this.rowGraphics.strokeRoundedRect(ROW_X, y, ROW_WIDTH, ROW_HEIGHT, 14)

      this.rowGraphics.fillStyle(stroke, state === 'idle' ? 0.22 : 0.35)
      this.rowGraphics.fillRoundedRect(ROW_X + 10, y + 10, 60, ROW_HEIGHT - 20, 10)

      this.rowTexts[index]?.setColor(textColor)

      if (state === 'wrong') {
        this.glyphTexts[index]?.setText('✕')
        this.glyphTexts[index]?.setColor('#ff9c9c')
      } else if (state === 'correct') {
        this.glyphTexts[index]?.setText('✓')
        this.glyphTexts[index]?.setColor('#9dffc7')
      } else {
        this.glyphTexts[index]?.setText(GLYPHS[index])
        this.glyphTexts[index]?.setColor('#ffffff')
      }
    }

    if (progress.hintRevealed) {
      this.hintText.setText(question.hint)
      this.hintBox.setVisible(true)
    }
  }

  private answer(index: number) {
    const progress = this.state.get(this.standId)
    const question = TRIVIA[this.standId]

    if (progress.solved || this.state.isCoolingDown(this.standId, Date.now())) {
      return
    }
    if (progress.wrongAnswers.has(index)) {
      return
    }

    if (index === question.correct) {
      progress.solved = true
      this.redraw()
      this.statusText.setColor('#9dffc7').setText('Corect! Ai primit o medalie.')
      this.celebrate()
      this.time.delayedCall(1500, () => this.close())
      return
    }

    progress.wrongAnswers.add(index)
    progress.hintRevealed = true
    progress.cooldownUntil = Date.now() + COOLDOWN_MS
    this.redraw()
    this.cameras.main.shake(180, 0.006)
  }

  private celebrate() {
    this.add
      .particles(this.scale.width / 2, 320, 'sparkle', {
        speed: { min: 140, max: 380 },
        scale: { start: 1.1, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 900,
        quantity: 30,
        emitting: false,
      })
      .explode(30)
  }

  private close() {
    const solved = this.state.get(this.standId).solved
    const world = this.scene.get('world') as WorldScene

    this.bridge.publish({ screen: 'world' })
    this.scene.resume('world')
    world.onTriviaClosed(this.standId, solved && !this.solvedOnOpen)
    this.scene.stop()
  }

  update() {
    const edges = this.bridge.consumeEdges()

    if (edges.has('action')) {
      this.close()
      return
    }

    const progress = this.state.get(this.standId)
    const remaining = this.state.remainingCooldown(this.standId, Date.now())

    if (progress.solved) {
      this.statusText.setColor('#9dffc7').setText('Rezolvat ✓')
    } else if (remaining > 0) {
      this.statusText
        .setColor('#ff9c9c')
        .setText(`Răspuns greșit. Mai poți încerca în ${Math.ceil(remaining / 1000)}s`)
    } else if (progress.wrongAnswers.size > 0) {
      this.statusText.setColor('#ffd489').setText('Poți încerca din nou.')
    } else {
      this.statusText.setColor('#ffd489').setText('Alege un răspuns cu butoanele de mișcare.')
    }

    if (progress.solved || remaining > 0) {
      return
    }

    for (let index = 0; index < DIRECTIONS.length; index += 1) {
      if (edges.has(DIRECTIONS[index])) {
        this.answer(index)
        return
      }
    }
  }
}
