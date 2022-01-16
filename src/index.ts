// https://www.stefanjudis.com/today-i-learned/measuring-execution-time-more-precisely-in-the-browser-and-node-js/
const startTime = process.hrtime();

import "dotenv/config";
const botName = process.env.BOT_NAME ?? "Bot";
console.log(`Starting ${botName}... this might take a while.`);

import "reflect-metadata";
import { CustomClient } from "./structures/CustomClient";
import { DatabaseManager } from "./managers/DatabaseManager";
import { Discord, Logger, Utils, version } from "@framedjs/core";
import { TypeORMLogger } from "./logger/TypeORMLogger";
import * as TypeORM from "typeorm";
import Colors from "colors";
import fs from "fs";
import path from "path";
import Winston from "winston";

// Sets up loggers
Logger.level = process.env.LOGGER_LEVEL ? process.env.LOGGER_LEVEL : "silly";
const format = Winston.format;
const DbLogger = Winston.createLogger({
	level: process.env.TYPEORM_WINSTON_LOGGER_LEVEL,
	levels: TypeORMLogger.defaultLevels.levels,
	format: format.combine(
		format.colorize({
			colors: TypeORMLogger.defaultLevels.colors,
		}),
		format.timestamp({
			format: "HH:mm:ss",
		}),
		format.printf(info => {
			const timestamp = Colors.gray(`[${info.timestamp}]`);
			return `${timestamp} ${info.level}: ${info.message}`;
		})
	),
	transports: [new Winston.transports.Console()],
});

// Gets the version of the app
let appVersion: string;
try {
	const packageFile = fs.readFileSync(
		path.resolve(__dirname, "../package.json"),
		"utf8"
	);
	const packageJson = JSON.parse(packageFile);
	appVersion = packageJson.version;
} catch (error) {
	Logger.error((error as Error).stack);
	Logger.warn("Using 0.0.0 as the app version by default.");
	appVersion = "0.0.0";
}
const importTime = Utils.hrTimeElapsed(startTime);

async function start() {
	Logger.info(
		`Starting ${botName} v${appVersion}, currently running Framed.js v${version}.`
	);
	Logger.verbose(`${importTime}s - Loaded imports.`);

	// Get connection options, and adds the logger
	let connectionOptions: TypeORM.ConnectionOptions;
	let ormconfig: any = undefined;

	//#region Connection Options
	// If we're in a dev environment,
	// the bot attempts to find ormconfig.ts first
	try {
		ormconfig = require(process.env.NODE_ENV == "development"
			? "../data/ormconfig.ts"
			: "../data/ormconfig.json");
	} catch (error) {
		try {
			ormconfig = require(process.env.NODE_ENV == "development"
				? "../data/ormconfig.json"
				: "../data/ormconfig.js");
		} catch (error) {
			try {
				// Gets any possible connection options from env
				connectionOptions = await TypeORM.getConnectionOptions();
			} catch (error) {
				Logger.silly((error as Error).stack);

				// Use default ormconfig
				ormconfig = require(process.env.NODE_ENV == "development"
					? "./ormconfig-dev.json"
					: "./ormconfig-prod.json");
			}
		}
	}

	if (ormconfig.default) {
		connectionOptions = ormconfig.default;
	} else {
		connectionOptions = ormconfig;
	}
	Object.assign(connectionOptions, {
		logger: new TypeORMLogger(DbLogger, "all"),
	});
	//#endregion

	// Initializes Database
	if (!(await TypeORM.createConnection(connectionOptions))) {
		throw new ReferenceError(DatabaseManager.errorNotFound);
	}

	// Initializes the client
	const client = new CustomClient({
		appVersion: appVersion,
		autoInitialize: {
			api: false,
			commands: false,
			plugins: false,
			provider: false,
		},
		defaultPrefix: process.env.DEFAULT_PREFIX,
		discord: {
			botOwners: process.env.BOT_OWNERS?.split(","),
		},
		footer: "",
	});

	// Load plugins
	client.plugins.loadPluginsIn({
		dirname: path.join(__dirname, "plugins"),
		filter: /^(.+plugin)\.(js|ts)$/,
		excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)$/,
	});
	Logger.verbose(
		`${Utils.hrTimeElapsed(startTime)}s - Loaded custom plugins.`
	);

	// Initializes providers, and providers
	await client.provider.init();
	await client.database.init();

	// Login
	await client.login({
		type: "discord",
		token: process.env.DISCORD_TOKEN,
		clientOptions: {
			allowedMentions: {
				parse: ["users", "roles"],
			},
			intents: [
				"DIRECT_MESSAGES",
				"DIRECT_MESSAGE_REACTIONS",
				"GUILDS",
				"GUILD_EMOJIS_AND_STICKERS",
				"GUILD_MESSAGES",
				"GUILD_MESSAGE_REACTIONS",
			],
			partials: ["MESSAGE", "CHANNEL", "REACTION", "USER"],
			makeCache: Discord.Options.cacheWithLimits({
				...Discord.Options.defaultMakeCacheSettings,

				ApplicationCommandManager: {
					maxSize: Infinity,
					sweepFilter:
						// Life is 15 minutes
						Discord.LimitedCollection.filterByLifetime({
							lifetime: 15 * 60,
						}),
					sweepInterval: 30 * 60,
				}, // guild.commands
				GuildBanManager: 0, // guild.bans
				GuildInviteManager: 0, // guild.invites
				GuildMemberManager: 100, // guild.members
				GuildStickerManager: 0, // guild.stickers
				MessageManager: 50, // channel.messages
				PresenceManager: 0, // guild.presences
				StageInstanceManager: 0, // guild.stageInstances
				UserManager: {
					// client.users
					// Keeps reaction user for 6 hours, sweeps every 4
					sweepFilter: Discord.LimitedCollection.filterByLifetime({
						lifetime: 6 * 60 * 60,
					}),
					sweepInterval: 4 * 60 * 60,
				},
				ReactionManager: {
					// message.reactions
					maxSize: Infinity,
					sweepFilter: Discord.LimitedCollection.filterByLifetime({
						lifetime: 6 * 60 * 60,
					}),
					sweepInterval: 4 * 60 * 60,
				},
				ReactionUserManager: {
					// reaction.users
					maxSize: Infinity,
					sweepFilter: Discord.LimitedCollection.filterByLifetime({
						lifetime: 6 * 60 * 60,
					}),
					sweepInterval: 4 * 60 * 60,
				},
				VoiceStateManager: 0, // guild.voiceStates
			}),
		},
	});

	const hrTimeElapsed = Utils.hrTimeElapsed(startTime);
	Logger.info(
		`Done (${hrTimeElapsed}s)! ${botName} v${appVersion} (Framed.js v${version}) has been loaded.`
	);
}

start();
