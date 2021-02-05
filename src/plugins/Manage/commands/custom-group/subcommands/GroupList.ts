import {
	BaseCommand,
	BaseSubcommand,
	EmbedHelper,
	Message,
} from "@framedjs/core";
import { oneLine } from "common-tags";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "list",
			aliases: ["ls", "l", "show"],
			about: "Lists all custom groups.",
		});
	}

	async run(msg: Message): Promise<boolean> {
		// Checks for permission
		if (
			!this.baseCommand.hasPermission(msg, this.baseCommand.permissions)
		) {
			this.baseCommand.sendPermissionErrorMessage(msg);
			return false;
		}

		const groupRepo = this.client.database.groupRepo;
		if (groupRepo) {
			let template = "";
			const groups = await groupRepo.find();
			groups.forEach(element => {
				template += `${element.emote ? element.emote : "❔"} **${
					element.name
				}** - \`${element.id}\`\n`;
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
					used on commands to be organized, and shown in commands such as \`${
						helpPrefix ? helpPrefix : this.client.defaultPrefix
					}${helpCommand?.id ? helpCommand.id : "help"}\`.`
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
				await msg.discord?.channel.send(embed);
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
