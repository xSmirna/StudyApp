import { addStudySeconds } from '../db/repositories/studyTime'
import { evaluateAndStoreAchievements } from '../db/repositories/achievements'
import { accrueActiveSeconds, IDLE_TIMEOUT_MS } from '../domain/studyTime'

/**
 * Productive study-time tracker.
 * Counts only while the document is visible and the user interacted within
 * the last 60 seconds. Uses wall-clock timestamps (not interval ticks alone).
 * A sudden crash may lose a small amount of uncommitted time.
 */
export class StudyTimeTracker {
  private lastTickAt: number | null = null
  private lastInteractionAt = 0
  private visible = true
  private active = false
  private uncommittedSeconds = 0
  private started = false
  private persisting: Promise<void> | null = null

  start(): void {
    if (this.started || typeof document === 'undefined') {
      return
    }
    this.started = true
    this.visible = document.visibilityState === 'visible'

    const onInteraction = () => this.noteInteraction()
    window.addEventListener('pointerdown', onInteraction)
    window.addEventListener('keydown', onInteraction)
    window.addEventListener('mousemove', onInteraction)
    window.addEventListener('scroll', onInteraction, { passive: true })
    document.addEventListener('visibilitychange', () => this.onVisibilityChange())
    window.addEventListener('pagehide', () => {
      void this.flush(true)
    })

    setInterval(() => {
      this.tick()
      void this.flush(false)
    }, 5000)
  }

  noteInteraction(now = Date.now()): void {
    this.lastInteractionAt = now
    if (this.visible && !this.active) {
      this.active = true
      this.lastTickAt = now
    }
  }

  private onVisibilityChange(): void {
    this.tick()
    void this.flush(true)
    this.visible = document.visibilityState === 'visible'
    if (!this.visible) {
      this.active = false
      this.lastTickAt = null
    }
  }

  /** Exposed for tests — advance accrual using wall-clock math. */
  tick(now = Date.now()): void {
    if (this.lastTickAt === null) {
      if (this.visible && this.active) {
        this.lastTickAt = now
      }
      return
    }

    const result = accrueActiveSeconds({
      lastTickAt: this.lastTickAt,
      now,
      lastInteractionAt: this.lastInteractionAt,
      visible: this.visible,
      active: this.active,
      idleTimeoutMs: IDLE_TIMEOUT_MS,
    })

    this.uncommittedSeconds += result.seconds
    this.active = result.stillActive
    this.lastTickAt = result.nextTickAt
  }

  async flush(evaluateAchievements = false): Promise<void> {
    this.tick()
    const seconds = this.uncommittedSeconds
    if (seconds < 0.5) {
      return
    }
    this.uncommittedSeconds = 0

    if (this.persisting) {
      await this.persisting
    }

    this.persisting = (async () => {
      await addStudySeconds(seconds)
      if (evaluateAchievements) {
        await evaluateAndStoreAchievements()
      }
    })()

    await this.persisting
    this.persisting = null
  }
}

export const studyTimeTracker = new StudyTimeTracker()
