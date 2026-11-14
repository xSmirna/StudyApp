import { useEffect } from 'react'
import { createQuestion } from '../db/repositories/questions'
import type { QuestionInput } from '../domain/types'
import { QuestionEditorForm } from '../features/questions/QuestionEditorForm'
import { CreamButton } from './CreamButton'

type QuestionEditorDialogProps = {
  chapterId: string
  onCreated: () => void | Promise<void>
  onCancel: () => void
}

export function QuestionEditorDialog({
  chapterId,
  onCreated,
  onCancel,
}: QuestionEditorDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  async function handleSubmit(input: QuestionInput) {
    await createQuestion(input)
    await onCreated()
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="dialog question-editor-dialog forest-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-editor-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-title-row question-editor-dialog-header">
          <h2 id="question-editor-title" className="panel-inline-title">
            New question
          </h2>
          <CreamButton
            iconOnly
            className="progress-collapse-button"
            aria-label="Close"
            title="Close"
            onClick={onCancel}
          >
            ×
          </CreamButton>
        </div>
        <QuestionEditorForm
          chapterId={chapterId}
          submitLabel="Create question"
          onSubmit={handleSubmit}
          onCancel={onCancel}
        />
      </div>
    </div>
  )
}
