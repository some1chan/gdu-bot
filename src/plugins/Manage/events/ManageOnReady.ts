import {
	BaseEvent,
	BaseMessage,
	BasePlugin,
	Discord,
	Logger,
	Utils,
} from "@framedjs/core";
import Schedule from "node-schedule";

export default class extends BaseEvent {
	presences: Discord.PresenceData[] = [];
	job: Schedule.Job | undefined;
	presenceIndex = 0;
	cron = "*/30 * * * * *";
	// cron = "*/15 * * * * *";

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "manageReady",
			discord: {
				name: "ready",
			},
		});
	}

	async init(): Promise<void> {
		// Hacky workaround to always run on Discord ready, since the ready event
		// might have already happened before initializing
		super.init();

		await this.build();
		if (!this.job) {
			// Sets up the job
			this.job = Schedule.scheduleJob(this.cron, () =>
				this.setPresence()
			);

			// Then runs it immediately for start-up
			this.setPresence();
		} else {
			Logger.warn(
				`Event "${this.discord?.name}" from ${this.plugin.id} already has its job running!`
			);
		}
	}

	async run(): Promise<void> {
		// Filler function, so no errors show up
		return;
	}

	async build(): Promise<void> {
		const help = await BaseMessage.format(
			`$(command default.bot.info help)`,
			this.client,
			{
				id: "default",
				platform: "none",
			}
		);
		const names = [`${help} and -help`];

		names.forEach(name => {
			this.presences.push({
				activities: [
					{
						name: name,
					},
				],
			});
		});
	}

	async setPresence(presenceIndex = this.presenceIndex): Promise<void> {
		if (this.discord) {
			try {
				Logger.silly(
					`Setting activity to "${Utils.util.inspect(
						this.presences[presenceIndex]
					)}"`
				);
				this.discord.client?.user?.setPresence(
					this.presences[presenceIndex]
				);
			} catch (error) {
				Logger.error((error as Error).stack);
			}

			// Increments number
			this.presenceIndex = (presenceIndex + 1) % this.presences.length;
		}
	}
}
