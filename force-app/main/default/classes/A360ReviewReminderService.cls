public without sharing class A360ReviewReminderService {
  private static final String REMINDER_SUBJECT = 'Review welfare assessment';

  public class Request {
    @InvocableVariable
    public String asOfDate;
  }

  public class Result {
    @InvocableVariable
    public Integer reminderCount;

    @InvocableVariable
    public Date targetDate;
  }

  @InvocableMethod(label='Create Review Reminder Tasks')
  public static List<Result> createReminderTasks(List<Request> requests) {
    List<Result> results = new List<Result>();
    if (requests == null || requests.isEmpty()) {
      return results;
    }

    Animal360_Automation_Setting__mdt automationSetting = [
      SELECT Create_Reminder_Tasks__c, Reminder_Lead_Days__c
      FROM Animal360_Automation_Setting__mdt
      WHERE Setting_Key__c = 'DEFAULT'
      LIMIT 1
    ];
    Integer reminderLeadDays = automationSetting.Reminder_Lead_Days__c == null
      ? 0
      : Integer.valueOf(
          String.valueOf(automationSetting.Reminder_Lead_Days__c)
        );

    for (Request requestItem : requests) {
      Date asOfDate = requestItem == null
        ? null
        : parseDate(requestItem.asOfDate);
      if (asOfDate == null) {
        asOfDate = Date.today();
      }

      Date targetDate = asOfDate.addDays(reminderLeadDays);
      Integer reminderCount = automationSetting.Create_Reminder_Tasks__c
        ? createTasksForTargetDate(targetDate)
        : 0;

      Result result = new Result();
      result.reminderCount = reminderCount;
      result.targetDate = targetDate;
      results.add(result);
    }

    return results;
  }

  private static Integer createTasksForTargetDate(Date targetDate) {
    List<Welfare_Assessment__c> dueAssessments = [
      SELECT
        Id,
        Name,
        Assessor__c,
        Next_Review_Date__c,
        Overall_Welfare_Concern__c,
        Animal_Episode__c
      FROM Welfare_Assessment__c
      WHERE
        Assessment_Status__c = 'Completed'
        AND Next_Review_Date__c != NULL
        AND Next_Review_Date__c <= :targetDate
    ];
    if (dueAssessments.isEmpty()) {
      return 0;
    }

    Set<Id> assessmentIds = new Set<Id>();
    for (Welfare_Assessment__c assessmentRecord : dueAssessments) {
      assessmentIds.add(assessmentRecord.Id);
    }

    Set<Id> assessmentIdsWithOpenReminder = new Set<Id>();
    for (Task existingTask : [
      SELECT Id, WhatId
      FROM Task
      WHERE
        WhatId IN :assessmentIds
        AND Subject = :REMINDER_SUBJECT
        AND IsClosed = FALSE
    ]) {
      assessmentIdsWithOpenReminder.add(existingTask.WhatId);
    }

    List<Task> tasksToInsert = new List<Task>();
    for (Welfare_Assessment__c assessmentRecord : dueAssessments) {
      if (assessmentIdsWithOpenReminder.contains(assessmentRecord.Id)) {
        continue;
      }

      tasksToInsert.add(
        new Task(
          Subject = REMINDER_SUBJECT,
          ActivityDate = assessmentRecord.Next_Review_Date__c,
          Description = buildReminderDescription(assessmentRecord),
          OwnerId = assessmentRecord.Assessor__c == null
            ? UserInfo.getUserId()
            : assessmentRecord.Assessor__c,
          Priority = isHighPriority(assessmentRecord.Overall_Welfare_Concern__c)
            ? 'High'
            : 'Normal',
          Status = 'Not Started',
          WhatId = assessmentRecord.Id
        )
      );
    }

    if (!tasksToInsert.isEmpty()) {
      insert tasksToInsert;
    }

    return tasksToInsert.size();
  }

  private static String buildReminderDescription(
    Welfare_Assessment__c assessmentRecord
  ) {
    String description =
      'Follow-up review is due for welfare assessment ' +
      assessmentRecord.Name +
      '.';
    if (assessmentRecord.Next_Review_Date__c != null) {
      description +=
        ' Target review date: ' +
        String.valueOf(assessmentRecord.Next_Review_Date__c) +
        '.';
    }
    if (!String.isBlank(assessmentRecord.Overall_Welfare_Concern__c)) {
      description +=
        ' Current concern: ' +
        assessmentRecord.Overall_Welfare_Concern__c +
        '.';
    }
    if (assessmentRecord.Animal_Episode__c != null) {
      description +=
        ' Episode Id: ' +
        String.valueOf(assessmentRecord.Animal_Episode__c) +
        '.';
    }
    return description;
  }

  private static Boolean isHighPriority(String overallConcern) {
    return overallConcern == 'High' || overallConcern == 'Critical';
  }

  private static Date parseDate(String rawValue) {
    if (String.isBlank(rawValue)) {
      return null;
    }
    return Date.valueOf(rawValue);
  }
}
