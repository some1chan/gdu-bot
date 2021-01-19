import { stripIndent } from "common-tags";
import { EmbedHelper, Message, BasePlugin, BaseCommand } from "framed.js";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "usage",
			about:
				"Shows what the `[]` and `<>` brackets means, along other syntax.",
		});
	}

	async run(msg: Message): Promise<boolean> {
		if (msg.discord) {
			const bulletPoint = "​ **•** ​ ";
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				this.client.helpCommands,
				this.id
			)
				.setTitle("Usage Key")
				.setDescription(
					stripIndent`
					\`[]\` - This field is optional.
					\`<>\` - This field is mandatory.
					\`A | B\` - You can choose either A or B.
					\`...A\` - Multiple parameters could be put here.
					`
				)
				.addField(
					"Notes",
					stripIndent`
					${bulletPoint}In most cases, **do not use brackets** while trying to run commands.
					${bulletPoint}If shown, quotes are *usually* needed (ex. fields with spaces), but not always. 
					${bulletPoint}The usage statements may be inaccurate in order to simplify them.
					`
				);

			await msg.discord.channel.send(embed);
		}

		return true;
	}
}
