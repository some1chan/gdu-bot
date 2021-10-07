import {
	BaseCommand,
	BaseMessage,
	BaseSubcommand,
	EmbedHelper,
	FriendlyError,
	Logger,
} from "@framedjs/core";
import { oneLine } from "common-tags";
import { CustomClient } from "../../../../../structures/CustomClient";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "list",
			aliases: ["ls", "l", "show"],
			about: "Lists all custom groups.",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (!(this.client instanceof CustomClient)) {
			Logger.error(
				"CustomClient is needed! This code needs a reference to DatabaseManager"
			);
			throw new FriendlyError(
				oneLine`The bot wasn't configured correctly!
				Contact one of the developers about this issue.`
			);
		}

		const groupRepo = this.client.database.groupRepo;
		if (groupRepo) {
			let template = "";
			const groups = await groupRepo.find();
			groups.forEach(element => {
				template += `${element.emote ?? "❔"} **${element.name}** - \`${
					element.id
				}\`\n`;
			});

			if (msg.discord) {
				const helpCommand = this.client.plugins.map
					.get("default.bot.info")
					?.commands.get("help");
				const helpPrefix = helpCommand?.defaultPrefix;

				const embed = EmbedHelper.getTemplate(
					msg.discord,
					await EmbedHelper.getCheckOutFooter(msg, this.id)
				)
					.setTitle("Group List")
					.setDescription(
						oneLine`
						Here are a list of groups found. Groups are designed to be
						used on commands to be organized, and shown in commands such as
						\`$(command help)\`.`
					)
					.addField(
						"Layout",
						oneLine`In the list, icons are shown first. If there is no icon,
						it will show the ❔ icon by default. The next element is simply
						the group's name. The last element is the ID, as stored in the database,
						or generated through script data.`
					)
					.addField(
						"Groups",
						template.length > 0
							? template
							: "There are no groups! Try `.group add` to create new groups."
					);
				await msg.discord?.channel.send({
					embeds: [
						await msg.client.formatting.formatEmbed(
							embed,
							await msg.getPlace()
						),
					],
				});
				return true;
			}
		} else {
			await msg.discord?.channel.send(
				`${msg.discord.author}, an error occured!`
			);
		}

		return false;
	}
}
