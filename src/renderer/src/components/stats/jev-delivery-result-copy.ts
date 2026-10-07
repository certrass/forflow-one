import { translate } from '@/i18n/i18n'

export function jevDeliveryResultCopy() {
  return {
    heading: translate('forflow.jevResultGuide.heading', 'Main finding'),
    next: translate('forflow.jevResultGuide.next', 'Suggested next action'),
    details: translate('forflow.jevResultGuide.details', 'Check details'),
    issues: translate('forflow.jevResultGuide.issues', 'View issues'),
    recheck: translate('forflow.jevResultGuide.recheck', 'Choose materials again'),
    missingAnswer: translate(
      'forflow.jevResultGuide.missingAnswer',
      'No answer was returned for this check.'
    ),
    confidenceHint: translate(
      'forflow.jevResultGuide.confidenceHint',
      'These numbers describe the model’s judgment, not the probability that delivery will pass acceptance.'
    ),
    nonconformanceProbability: translate(
      'forflow.jevResultGuide.nonconformanceProbability',
      'Probability that the material explicitly records an unresolved failure to meet this requirement'
    ),
    nonconformanceHint: translate(
      'forflow.jevResultGuide.nonconformanceHint',
      '“Yes” means an unresolved failure is explicitly documented. A low probability does not show that the requirement was met.'
    ),
    scoreHint: translate(
      'forflow.jevResultGuide.scoreHint',
      'This measures how clearly the prerequisites, steps and expected results are written. If no handoff instructions were selected, a low score does not mean the delivery failed.'
    ),
    questions: {
      criterion_evidence: translate(
        'forflow.jevResultGuide.evidenceQuestion',
        'Do these records support the requirement being met?'
      ),
      criterion_clarity: translate(
        'forflow.jevResultGuide.clarityQuestion',
        'Is the requirement specific enough to check?'
      ),
      documented_current_nonconformance: translate(
        'forflow.jevResultGuide.nonconformanceQuestion',
        'Do the original records explicitly document an unresolved failure?'
      ),
      handoff_operability: translate(
        'forflow.jevResultGuide.operabilityQuestion',
        'Can someone follow the handoff instructions?'
      ),
      handoff_criterion_coverage: translate(
        'forflow.jevResultGuide.coverageQuestion',
        'Would those instructions actually check this requirement?'
      )
    },
    questionHints: {
      criterion_evidence: translate(
        'forflow.jevResultGuide.evidenceHint',
        'This is the main judgment. It applies to this requirement and the selected material.'
      ),
      criterion_clarity: translate(
        'forflow.jevResultGuide.clarityHint',
        'If the requirement is vague, first state an observable expected result, then check it again.'
      ),
      documented_current_nonconformance: translate(
        'forflow.jevResultGuide.nonconformanceRecordHint',
        'Missing test results are an evidence gap; they do not by themselves document a failure.'
      ),
      handoff_operability: translate(
        'forflow.jevResultGuide.operabilityHint',
        'Only material marked as handoff instructions is used here. A clear procedure does not prove it was executed.'
      ),
      handoff_criterion_coverage: translate(
        'forflow.jevResultGuide.coverageHint',
        'Complete coverage means the written checks address the requirement; it does not mean those checks passed.'
      )
    },
    summaries: {
      supported: {
        title: translate(
          'forflow.jevResultGuide.supportedTitle',
          'The material supports this requirement'
        ),
        meaning: translate(
          'forflow.jevResultGuide.supportedMeaning',
          'Jev classified the selected material as supporting the requirement. Verify it against the original records and the version being reviewed.'
        ),
        action: translate(
          'forflow.jevResultGuide.supportedAction',
          'After checking the sources, confirm this review version when ready.'
        )
      },
      insufficient: {
        title: translate(
          'forflow.jevResultGuide.insufficientTitle',
          'More evidence is needed before deciding'
        ),
        meaning: translate(
          'forflow.jevResultGuide.insufficientMeaning',
          'More execution results or supporting materials are needed to assess this requirement.'
        ),
        action: translate(
          'forflow.jevResultGuide.insufficientAction',
          'Find the actual execution result or missing material. Record the gap as an issue if needed, then reread the sources and check again.'
        )
      },
      unmet: {
        title: translate(
          'forflow.jevResultGuide.unmetTitle',
          'The material records a failure to meet the requirement'
        ),
        meaning: translate(
          'forflow.jevResultGuide.unmetMeaning',
          'Jev classified the selected records as showing a current failure to meet this requirement. Check the original record before adopting it.'
        ),
        action: translate(
          'forflow.jevResultGuide.unmetAction',
          'Verify the failure and record an issue. After a fix, add its linked retest result, reread the sources and check again.'
        )
      },
      conflicting: {
        title: translate('forflow.jevResultGuide.conflictingTitle', 'The records disagree'),
        meaning: translate(
          'forflow.jevResultGuide.conflictingMeaning',
          'Jev found incompatible results in the selected material and could not resolve their relationship.'
        ),
        action: translate(
          'forflow.jevResultGuide.conflictingAction',
          'Check which object and version each result belongs to, and whether a later repair and retest supersedes an earlier failure. Record unresolved conflicts as issues.'
        )
      },
      historical: {
        title: translate(
          'forflow.jevResultGuide.historicalTitle',
          'This result uses an earlier evaluator'
        ),
        meaning: translate(
          'forflow.jevResultGuide.historicalMeaning',
          'Keep it as a historical record. It cannot be adopted as a current judgment.'
        ),
        action: translate(
          'forflow.jevResultGuide.historicalAction',
          'Return to the latest review version, choose the relevant material and prepare a new check.'
        )
      },
      previousVersion: {
        title: translate(
          'forflow.jevResultGuide.previousVersionTitle',
          'This judgment belongs to an earlier review version'
        ),
        meaning: translate(
          'forflow.jevResultGuide.previousVersionMeaning',
          'The result describes the material saved in that version. It cannot establish the state of the latest version.'
        ),
        action: translate(
          'forflow.jevResultGuide.previousVersionAction',
          'Select the latest review version and inspect the changed material before preparing a new check.'
        )
      },
      incomplete: {
        title: translate(
          'forflow.jevResultGuide.incompleteTitle',
          'No complete judgment is available'
        ),
        meaning: translate(
          'forflow.jevResultGuide.incompleteMeaning',
          'The request is unfinished, or one of the five answers is missing or unusable. Check the request status before retrying.'
        ),
        action: translate(
          'forflow.jevResultGuide.incompleteAction',
          'Read the request status above. Resolve any configuration or source problem before deciding whether to send a new request.'
        )
      }
    }
  }
}
