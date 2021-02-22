console.log("Starting bot... this might take a while.");

// https://www.stefanjudis.com/today-i-learned/measuring-execution-time-more-precisely-in-the-browser-and-node-js/
const startTime = process.hrtime();

import { Logger, LoginOptions, Utils, version } from "@framedjs/core";
import { CustomClient } from "./structures/CustomClient";
import { TypeORMLogger } from "./logger/TypeORMLogger";
import * as TypeORM from "typeorm";
import Colors from "colors";
import Winston from "winston";
import fs from "fs";
import path from "path";
import { DatabaseManager } from "./managers/DatabaseManager";

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

Logger.info(`${Utils.hrTimeElapsed(startTime)}s - Loaded imports.`);

async function start() {
	Logger.info(
		`Starting GDU Bot v${appVersion}, currently running Framed.js v${version}.`
	);

	// Get connection options, and adds the logger
	let connectionOptions: TypeORM.ConnectionOptions;

	//#region Connection Options
	if (process.env.NODE_ENV == "development") {
		try {
			const ormconfig = require("../data/ormconfig");
			if (ormconfig.default) {
				connectionOptions = ormconfig.default;
			} else {
				connectionOptions = ormconfig;
			}
		} catch (error) {
			// Gets any possible connection options from env
			connectionOptions = await TypeORM.getConnectionOptions();
		}
	} else {
		try {
			// Gets any possible connection options from env
			connectionOptions = await TypeORM.getConnectionOptions();
		} catch (error) {
			// The above can't read ormconfig in the proper folder. This is a workaround;
			// This code will require the ormconfig.{js,ts,json} file.
			const ormconfig = require("../ormconfig");
			if (ormconfig.default) {
				connectionOptions = ormconfig.default;
			} else {
				connectionOptions = ormconfig;
			}
		}
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
		defaultPrefix: process.env.DEFAULT_PREFIX,
		footer: [
			"$(command default.bot.info help)",
			"$(command default.bot.fun poll)",
			"$(command com.geekoverdrivestudio.dailies dailies)",
		],
		appVersion: appVersion,
		discord: {
			owners: ["200340393596944384"],
		},
	});

	// Load plugins
	client.plugins.loadPluginsIn({
		dirname: path.join(__dirname, "plugins"),
		filter: /^(.+plugin)\.(js|ts)$/,
		excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)$/,
	});
	Logger.info(`${Utils.hrTimeElapsed(startTime)}s - Loaded custom plugins.`);

	// Initializes DatabaseManager, and providers
	await client.database.init();
	await client.provider.init();

	//#region Creates login data
	const loginData: LoginOptions[] = [
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
	//#endregion

	// Login
	await client.login(loginData);

	const hrTimeElapsed = Utils.hrTimeElapsed(startTime);
	Logger.info(
		`Done (${hrTimeElapsed}s)! GDU Bot v${appVersion} (Framed.js v${version}) has been loaded.`
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
}

start();
