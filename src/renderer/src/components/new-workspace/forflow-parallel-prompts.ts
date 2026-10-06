import { translate } from '@/i18n/i18n'

export function forflowParallelPrompts() {
  return {
    alternative: {
      label: translate('forflow.parallel.alternative', 'Make another version'),
      prompt: translate(
        'forflow.parallel.alternativePrompt',
        'Task: [use the same goal in each task]\nReferences: [use the same files and requirements]\nSuccess criteria: [what a good result must achieve]\n\nDevelop your own approach independently. Deliver the result, explain your choices, and include verification results and any remaining issues. Save the output as a file and give its location so I can compare the versions.'
      )
    },
    comparison: {
      label: translate('forflow.parallel.comparison', 'Compare outputs'),
      prompt: translate(
        'forflow.parallel.comparisonPrompt',
        'Goal: compare the following outputs for [the original task].\nVersion A: [attach or paste the first output]\nVersion B: [attach or paste the second output]\nSuccess criteria: [the requirements used for both tasks]\n\nRead both outputs and their verification records. Compare requirement coverage, correctness, usability and the work needed to finish. Cite the material behind each finding, explain the differences, and recommend which version to use or which parts to combine. List missing material that prevents a conclusion. Keep the original files unchanged during this review.'
      )
    }
  }
}
