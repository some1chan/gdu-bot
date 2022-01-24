import type { Discord } from "@framedjs/core";

export function getValidAuditLog(
	fetchedLogs: Discord.GuildAuditLogs<"ALL">,
	userId?: string,
	compareFunc = checkValidAuditLog
) {
	for (const [, log] of fetchedLogs.entries) {
		if (compareFunc(log, userId)) {
			return log;
		}
	}
	return undefined;
}

export function checkValidAuditLog(
	log: Discord.GuildAuditLogsEntry<"ALL", "ALL", "ALL", "UNKNOWN">,
	userId?: string
) {
	// Target matches the userId from an event
	const matchingUserAndTarget =
		log?.target?.id && userId ? log.target.id == userId : false;

	return (
		// Time the audit log was created is within a certain time
		// (2 minutes)
		Math.abs(log.createdAt.getTime() - new Date().getTime()) <=
			2 * 60 * 1000 && matchingUserAndTarget
	);
}
