import { BasePlugin, BaseEvent, Message, Logger } from "framed.js";
import Discord from "discord.js";
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

	async run(): Promise<void> {
		await this.build();
		if (!this.job) {
			this.job = Schedule.scheduleJob(this.cron, () =>
				this.setPresence()
			);
			this.setPresence();
		} else {
			Logger.warn(
				`Event "${this.discord?.name}" from ${this.plugin.id} already has its job running!`
			);
		}
	}

	async build(): Promise<void> {
		const help = await Message.format(
			`$(command default.bot.info help) | `,
			this.client
		);
		const names = [
			`${help}Managing Streaks`,
			`${help}Testing Things`,
			`${help}Fixing "Features"`,
		];

		names.forEach(name => {
			this.presences.push({
				activity: {
					name: name,
				},
			});
		});
	}

	async setPresence(presenceIndex = this.presenceIndex): Promise<void> {
		if (this.discord) {
			try {
				Logger.debug(
					`Setting activity to "${this.presences[presenceIndex].activity?.name}"`
				);
				await this.discord.client?.user?.setPresence(
					this.presences[presenceIndex]
				);
			} catch (error) {
				Logger.error(error.stack);
			}

			// Increments number
			this.presenceIndex = (presenceIndex + 1) % this.presences.length;
		}
	}
}
