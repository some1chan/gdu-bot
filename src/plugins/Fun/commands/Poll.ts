/* eslint-disable no-mixed-spaces-and-tabs */
import {
	BaseCommand,
	BasePlugin,
	Message,
	EmbedHelper,
	PluginManager,
	Argument,
	Logger,
} from "@framedjs/core";
import Discord from "discord.js";
import { emotes, oneOptionMsg, optionEmotes } from "../Fun.plugin";
import { oneLine, stripIndents } from "common-tags";

export default class Poll extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "poll",
			about: "Create a quick poll through Discord.",
			description: stripIndents`
				Create a quick poll through Discord. 
				
				${oneLine`The \`once\` "choose one only" option will work for a while,
				until the bot is restarted. Once restarted, you shouldn't trust the
				poll votes for singular votes.`}
				
				${oneLine`For a lasting "choose one only" poll, please use a
				website like [strawpoll.me](https://strawpoll.me) instead!`}
				`,
			usage: '[once] <question> [..."options"]',
			hideUsageInHelp: true,
			examples: stripIndents`
				\`{{prefix}}{{id}} Do you like pineapple on pizza?\` - Simple Poll
				\`{{prefix}}{{id}} Rename \\"Pixel Pete\\"\` - Simple Poll With Quotes at the End
				\`{{prefix}}{{id}} Ban Bim? "Yes" "Sure" "Why Not"\` - Custom Options
				\`{{prefix}}{{id}} once PC or Console? "PC" "Console"\` - Choose One Only
			`,
		});
	}

	async run(msg: Message): Promise<boolean> {
		if (msg.discord) {
			const parseResults = await Poll.customParse(msg);
			if (!parseResults) return false;
			const askingForOnce = parseResults.askingForOnce;
			const pollOptionArgs = parseResults.pollOptionArgs;
			const questionContent = parseResults.questionContent;

			// If there some poll options
			if (pollOptionArgs.length >= 1) {
				if (pollOptionArgs.length == 1) {
					await msg.discord.channel.send(
						`${msg.discord.author}, you need at least more than one option!`
					);
					return false;
				}

				// Create the description with results
				const reactionEmotes: string[] = [];
				let description = "";
				let hasCodeBlock = false;

				for (let i = 0; i < pollOptionArgs.length; i++) {
					const element = pollOptionArgs[i];
					hasCodeBlock = element.endsWith("```");
					if (element) {
						const reactionEmote = optionEmotes[i];
						description += `${reactionEmote}  ${element}`;
						// Logger.warn(`${i} + 1 = ${newArgs.length}`);
						// If it's not the last element,
						// If there's more than 7 elements
						// If there isn't a codeblock to finish it off
						// Remove the extra new line
						if (i + 1 < pollOptionArgs.length) {
							description += "\n";
							if (
								// Is the amount of options less than 8
								pollOptionArgs.length < 8 &&
								// Is the end of this option not a codeblock
								!hasCodeBlock &&
								// Is this option not the last one
								i + 1 != pollOptionArgs.length
							)
								description += "\n";
						}

						reactionEmotes.push(reactionEmote);
					}
				}

				// Sends and creates the embed
				const embed = new Discord.MessageEmbed()
					.setColor(EmbedHelper.getColorWithFallback(msg.discord.guild))
					.setTitle(questionContent)
					.setDescription(
						`${description}${hasCodeBlock ? "" : "\n"}` +
							`\nPoll by ${msg.discord.author}` +
							`\n${askingForOnce ? oneOptionMsg : ""}`
					);
				const newMsg = await msg.discord.channel.send(embed);

				// Does the reactions
				const msgReact: Promise<Discord.MessageReaction>[] = [];
				reactionEmotes.forEach(element => {
					msgReact.push(newMsg.react(element));
				});
				try {
					await Promise.all(msgReact);
				} catch (error) {
					if (error == "Unknown Message") {
						Logger.warn(error);
					} else {
						Logger.error(error.stack);
					}
				}

				return true;
			} else if (questionContent?.length > 0) {
				// Reacts to a message
				// newMsg obtains a message by either msg.discord.msg, or
				// by getting the message through message ID
				const newMsg = msg.discord.msg
					? msg.discord.msg
					: msg.discord.id
					? msg.discord.channel.messages.cache.get(msg.discord.id)
					: undefined;
				if (newMsg) {
					const msgReact: Promise<Discord.MessageReaction>[] = [];
					if (newMsg) {
						emotes.forEach(element => {
							msgReact.push(newMsg.react(element));
						});
						await Promise.all(msgReact);
					}
				} else {
					// Cannot be called through scripts, as there is no real message to react to
					return false;
				}
			} else {
				await PluginManager.sendHelpForCommand(msg);
				return false;
			}
		}
		return true;
	}

	/**
	 * Does a custom parse, specifically for the Poll parameters
	 * @param msg Framed message
	 * @param silent Should the bot send an error?
	 */
	static async customParse(
		msg: Message,
		silent?: boolean
	): Promise<
		| {
				askingForOnce: boolean;
				onceMultipleOption: string;
				questionContent: string;
				pollOptionArgs: string[];
		  }
		| undefined
	> {
		// Makes sure prefix, command, and args exist
		if (!msg.args || !msg.prefix || !msg.command) {
			if (!silent)
				Logger.error(
					`Poll.ts: Important elements (prefix, command, and/or args) not found`
				);
			return;
		}

		let newContent = msg.getArgsContent();
		const newArgs = Message.getArgs(newContent, {
			quoteSections: "flexible",
		});

		let onceMultipleOption = "";

		const isOnce = newContent.startsWith("once");
		const isMultiple = newContent.startsWith("multiple");
		const isOnceOrMultiple = isOnce || isMultiple;

		// Removes the once/multiple parma from newContent
		if (isOnceOrMultiple) {
			if (isOnce) {
				onceMultipleOption = "once";
			} else if (isMultiple) {
				onceMultipleOption = "multiple";
			}

			// Handles combined "once question"
			newContent = newContent
				.replace(`${onceMultipleOption} `, ``)
				.replace(onceMultipleOption, "");

			// If there is no content now, the argument was alone before.
			// This means we can remove it from args
			if (newArgs[0].length == 0) {
				newArgs.shift();
			}
		}

		// Attempts to get arguments with a strict quote section mode in mind,
		// while allowing for the question content to contain quotes.
		let detailedArgs: Argument[] = [];
		let elementExtracted: string;
		let questionContent = "";
		let lastElementQuoted = false;
		do {
			detailedArgs = Message.getDetailedArgs(newContent, {
				quoteSections: "flexible",
			});

			let failed = false;
			detailedArgs.forEach(arg => {
				// If the argument was closed improperly, or wasn't quoted,
				// the argument hasn't been parsed correctly yet
				if (arg.nonClosedQuoteSection || !arg.wrappedInQuotes) {
					failed = true;
				}
			});

			if (failed) {
				const firstArg = detailedArgs.shift();
				if (firstArg) {
					elementExtracted = firstArg.untrimmedArgument;

					// Re-adds any quotes that were previously parsed out
					let leadingQuote = ``;
					let trailingQuote = ``;
					if (firstArg.wrappedInQuotes) {
						leadingQuote += `"`;
						if (!firstArg.nonClosedQuoteSection) {
							trailingQuote += `"`;
						}
					}
					elementExtracted = `${leadingQuote}${elementExtracted}${trailingQuote}`;

					let extraSpace = "";
					if (lastElementQuoted && firstArg.wrappedInQuotes) {
						extraSpace = " ";
					}
					questionContent += `${extraSpace}${elementExtracted}`;
					newContent = newContent.replace(elementExtracted, "");

					lastElementQuoted = firstArg.wrappedInQuotes;
				} else {
					Logger.error("Poll.ts: lastArg is undefined, but should have exited earlier!");
					break;
				}
			} else {
				break;
			}
		} while (detailedArgs.length > 0);

		const pollOptionArgs = Message.simplifyArgs(detailedArgs);

		Logger.silly(`onceMultipleOption ${isOnceOrMultiple}`);
		Logger.silly(`newArgs: "${newArgs}"`);

		Logger.silly(stripIndents`
			new Poll.ts: 
			newContent: '${newContent}'
			questionContent: '${questionContent}'
			newArgs: '${newArgs}'
			onceMultipleOption: '${onceMultipleOption}'
			pollOptionsArgs: [${pollOptionArgs}]
		`);

		return {
			askingForOnce: isOnceOrMultiple,
			onceMultipleOption,
			questionContent,
			pollOptionArgs,
		};
	}
}
