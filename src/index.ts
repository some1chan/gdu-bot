// https://www.stefanjudis.com/today-i-learned/measuring-execution-time-more-precisely-in-the-browser-and-node-js/
const startTime = process.hrtime();

import { TypeORMLogger } from "./logger/TypeORMLogger";
import * as Framed from "@framedjs/core";
import Colors from "colors";
import Winston from "winston";
import fs from "fs";
import path from "path";
import { sep } from "path";

// Sets up loggers
const Logger = Framed.Logger;
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
let appVersion: string | undefined;
try {
	const packageFile = fs.readFileSync(
		path.resolve(__dirname, "../package.json"),
		"utf8"
	);
	const packageJson = JSON.parse(packageFile);
	appVersion = packageJson.version;
} catch (error) {
	Logger.error(error.stack);
}

Logger.info(`${Framed.Utils.hrTimeElapsed(startTime)}s - Loaded imports.`);

async function start() {
	Logger.info(
		`Starting GDU Bot v${appVersion}, currently running Framed.js v${Framed.version}.`
	);

	console.log(Framed.DatabaseManager.defaultEntitiesPath)

	// Get connection options, and add the logger
	const connectionOptions = await Framed.TypeORM.getConnectionOptions();
	Object.assign(connectionOptions, {
		database: `${__dirname}${sep}..${sep}data${sep}FramedDB.sqlite`,
		entities: [Framed.DatabaseManager.defaultEntitiesPath],
		logger: new TypeORMLogger(DbLogger, "all"),
	});

	// Initializes Client
	const client = new Framed.Client({
		defaultConnection: connectionOptions,
		defaultPrefix: process.env.DEFAULT_PREFIX,
		defaultHelpCommands: [
			"$(command default.bot.info help)",
			"$(command default.bot.fun poll)",
			"$(command com.geekoverdrivestudio.dailies dailies)",
		],
		appVersion: appVersion,
	});

	// Creates login data
	const loginData: Framed.LoginOptions[] = [
		{
			type: "discord",
			discord: {
				token: process.env.DISCORD_TOKEN,
			},
		},
	];

	if (
		process.env.TWITCH_ACCESS_TOKEN &&
		process.env.TWITCH_CLIENT_ID &&
		process.env.TWITCH_CLIENT_SECRET &&
		process.env.TWITCH_REFRESH_TOKEN &&
		process.env.TWITCH_CHANNELS
	) {
		// If all the environmental variable values exist, push Twitch as a possible login
		loginData.push({
			type: "twitch",
			twitch: {
				accessToken: process.env.TWITCH_ACCESS_TOKEN,
				clientId: process.env.TWITCH_CLIENT_ID,
				clientSecret: process.env.TWITCH_CLIENT_SECRET,
				refreshToken: process.env.TWITCH_REFRESH_TOKEN,
				clientOptions: {
					channels: process.env.TWITCH_CHANNELS.split(","),
					logger: {
						// name: "",
						timestamps: false,
						// colors: false,
						emoji: false,
					},
				},
			},
		});
	}

	// Load plugins
	client.plugins.loadPluginsIn({
		dirname: path.join(__dirname, "plugins"),
		filter: /^(.+plugin)\.(js|ts)$/,
		excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)$/,
	});

	Logger.info(
		`${Framed.Utils.hrTimeElapsed(startTime)}s - Loaded custom plugins.`
	);

	// Login
	client.login(loginData).then(async () => {
		Logger.info(
			`Done (${Framed.Utils.hrTimeElapsed(startTime)}s)! Framed.js v${
				Framed.version
			} has been loaded.`
		);

		client.discord.client
			?.generateInvite({
				permissions: [
					// Likely required for most bots
					"SEND_MESSAGES",

					// Used in help command, but also allows the potential to use emojis from other servers
					"USE_EXTERNAL_EMOJIS",

					// Used for getting old messages with polls, after a restart
					"READ_MESSAGE_HISTORY",

					// Reactions and embeds needed for polls
					"ADD_REACTIONS",
					"EMBED_LINKS",

					// Extra permissions for just-in-case
					"MANAGE_MESSAGES",
					"VIEW_CHANNEL",

					// CUSTOM BOT STUFF
					// Needs to give user a role
					"MANAGE_ROLES",
				],
			})
			.then(link => Logger.info(`Generated bot invite link:\n${link}`))
			.catch(Logger.error);
	});
}

start();
