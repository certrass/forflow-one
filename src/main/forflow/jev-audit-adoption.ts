import type { JevReceipt } from '../../shared/jev-audit-types'
import { canRecordJevAnswer } from '../../shared/jev-delivery-assessment'

export function jevAdoptionSuggestion(receipt: JevReceipt, question: string) {
  const answer = receipt.result?.answers[question]
  if (!answer || !canRecordJevAnswer(question, answer) || answer.type !== 'choice') {
    return null
  }
  if (receipt.mode !== 'delivery') {
    return {
      title:
        answer.choice === 'conflict'
          ? 'Jev：主张与所选记录冲突'
          : answer.choice === 'attention'
            ? 'Jev：所选记录存在待核实异常'
            : 'Jev：所选记录需要补充证据',
      value: answer.choice
    }
  }
  const titles: Record<string, string> = {
    criterion_clarity: 'Jev：明确本项交付要求',
    criterion_evidence:
      answer.choice === 'unmet'
        ? 'Jev：核对当前未达到的要求'
        : answer.choice === 'conflicting'
          ? 'Jev：核对存在分歧的证据'
          : 'Jev：补充本项要求的证据',
    handoff_criterion_coverage: 'Jev：补充覆盖本项要求的验证步骤'
  }
  return { title: titles[question] ?? 'Jev：核对质量检查建议', value: answer.choice }
}
