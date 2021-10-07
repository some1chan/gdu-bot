console.log("Starting bot... this might take a while.");

const botName = "smol";
// https://www.stefanjudis.com/today-i-learned/measuring-execution-time-more-precisely-in-the-browser-and-node-js/
const startTime = process.hrtime();

import "reflect-metadata";
import { Discord, Logger, LoginOptions, Utils, version } from "@framedjs/core";
import { CustomClient } from "./structures/CustomClient";
import { DatabaseManager } from "./managers/DatabaseManager";
import { TypeORMLogger } from "./logger/TypeORMLogger";
import * as TypeORM from "typeorm";
import Colors from "colors";
import Winston from "winston";
import fs from "fs";
import path from "path";

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

	//#region Connection Options
	if (process.env.NODE_ENV == "development") {
		// If we're in a dev environment,
		// the bot attempts to find ormconfig.ts first
		try {
			const ormconfig = require("../data/ormconfig.ts");
			if (ormconfig.default) {
				connectionOptions = ormconfig.default;
			} else {
				connectionOptions = ormconfig;
			}
		} catch (error) {
			try {
				const ormconfig = require("../data/ormconfig.json");
				if (ormconfig.default) {
					connectionOptions = ormconfig.default;
				} else {
					connectionOptions = ormconfig;
				}
			} catch (error) {
				// Gets any possible connection options from env
				connectionOptions = await TypeORM.getConnectionOptions();
			}
		}
	} else {
		try {
			const ormconfig = require("../data/ormconfig.json");
			if (ormconfig.default) {
				connectionOptions = ormconfig.default;
			} else {
				connectionOptions = ormconfig;
			}
		} catch (error) {
			try {
				const ormconfig = require("../data/ormconfig.js");
				if (ormconfig.default) {
					connectionOptions = ormconfig.default;
				} else {
					connectionOptions = ormconfig;
				}
			} catch (error) {
				// Gets any possible connection options from env
				connectionOptions = await TypeORM.getConnectionOptions();
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
		footer: [
			"$(command default.bot.info help)",
			"$(command default.bot.fun poll)",
			"$(command com.geekoverdrivestudio.dailies dailies)",
		],
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

	const loginData: LoginOptions[] = [
		{
			type: "discord",
			discord: {
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
						MessageManager: 50,
						PresenceManager: 0,
					}),
				},
			},
		},
	];

	// Login
	await client.login(loginData);

	const hrTimeElapsed = Utils.hrTimeElapsed(startTime);
	Logger.info(
		`Done (${hrTimeElapsed}s)! ${botName} v${appVersion} (Framed.js v${version}) has been loaded.`
	);
}

start();
