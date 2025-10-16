#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { templates } from './constants/templates';
import * as fs from 'fs';
import * as path from 'path';
import { morning } from 'gradient-string';
import figlet from 'figlet';
import { Spinner } from 'cli-spinner';
import boxen from 'boxen';

const program = new Command();
const log = console.log;

const showWelcome = () => {
	console.clear();
	log(morning('\n' + figlet.textSync('Scaffold CLI', {
			font: 'Small',
			horizontalLayout: 'default',
		}))
	);

	log(boxen(chalk.blueBright('🚀 Supercharge your development with premium templates!'), {
		padding: 1,
		margin: 1,
		borderStyle: 'round',
		borderColor: 'cyan',
	}));
};

program
	.name('giomjds-template-cli')
	.description("CLI to create projects from GioMjds's predefined templates")
	.version('1.2.8');

program
	.command('create')
	.description('Create a new project from available project templates')
	.action(async () => {
		try {
			showWelcome();

			const templateAnswer = await inquirer.prompt<{ template: string }>([
				{
					type: 'list',
					name: 'template',
					message: chalk.hex('#FFA500')(
						'📁 What template would you like to use?'
					),
					choices: Object.entries(templates).map(([key, value]) => ({
						name: chalk.hex('#4FD6D9')(`📁 ${value.name}`),
						value: key,
						short: chalk.green(value.name),
					})),
					pageSize: 10,
					loop: false,
				},
			]);

			const selectedTemplate = templates[templateAnswer.template];
			log(chalk.hex('#FF6B6B')(`\n✨ Selected: ${chalk.bold(selectedTemplate.name)}\n`));

			const projectAnswer = await inquirer.prompt<{
				projectName: string;
			}>([
				{
					type: 'input',
					name: 'projectName',
					message: chalk.hex('#FFA500')('💼 What is your project named?'),
					default: 'my-app',
					validate: (input: string) => {
						const trimmed = input.trim();
						if (!trimmed) return chalk.red('❌ Project name cannot be empty');
						if (trimmed === '.' || trimmed === './') return true;
						if (fs.existsSync(trimmed)) {
							return chalk.red(`❌ Directory '${trimmed}' already exists!`);
						}
						if (!/^[a-zA-Z0-9._/-]+$/.test(trimmed)) {
							return chalk.red('❌ Project name contains invalid characters');
						}
						return true;
					},
					transformer: (input: string) => {
						return chalk.hex('#4FD6D9')(input);
					},
				},
			]);

			const projectName = projectAnswer.projectName.trim();
			const isCurrentDir = projectName === '.' || projectName === './';

			if (isCurrentDir) {
				const currentDirFiles = fs
					.readdirSync('.')
					.filter((file) => !file.startsWith('.'));
				if (currentDirFiles.length > 0) {
					const confirmCurrentDir = await inquirer.prompt<{
						confirm: boolean;
					}>([
						{
							type: 'confirm',
							name: 'confirm',
							message: chalk.yellow('⚠️  Current directory is not empty. Continue anyway?'),
							default: false,
						},
					]);
					if (!confirmCurrentDir.confirm) {
						log(chalk.yellow('❌ Project creation cancelled.'));
						return;
					}
				}
			}

			const displayName = isCurrentDir
				? 'current directory'
				: `"${chalk.cyan(projectName)}"`;

			// Create a styled confirmation prompt
			const confirmAnswer = await inquirer.prompt<{ confirm: boolean }>([
				{
					type: 'confirm',
					name: 'confirm',
					message: chalk.hex('#FFA500')(`Create project in ${displayName} with ${chalk.bold(selectedTemplate.name)}?`),
					default: true,
				},
			]);

			if (!confirmAnswer.confirm) {
				log(chalk.yellow('❌ Project creation cancelled.'));
				return;
			}

			const spinner = new Spinner(
				chalk.blue('%s 📦 Cloning template...')
			);
			spinner.setSpinnerString(18);
			spinner.start();

			try {
				if (isCurrentDir) {
					const tempDir = `temp-${Date.now()}`;
					execSync(`git clone ${selectedTemplate.repo} ${tempDir}`, {
						stdio: 'ignore',
					});

					const tempPath = path.resolve(tempDir);
					const files = fs.readdirSync(tempPath);

					spinner.setSpinnerTitle(
						chalk.blue('%s 📁 Moving files to current directory...')
					);

					files.forEach((file) => {
						const srcPath = path.join(tempPath, file);
						const destPath = path.join('.', file);
						fs.renameSync(srcPath, destPath);
					});

					fs.rmSync(tempPath, { recursive: true, force: true });

					const gitPath = path.join('.', '.git');
					if (fs.existsSync(gitPath)) {
						spinner.setSpinnerTitle(
							chalk.blue('%s 🧹 Cleaning up git history...')
						);
						fs.rmSync(gitPath, { recursive: true, force: true });
					}

					spinner.setSpinnerTitle(
						chalk.blue('%s 🔧 Initializing new git repository...')
					);
					execSync('git init', { stdio: 'ignore' });
				} else {
					execSync(`git clone ${selectedTemplate.repo} ${projectName}`, {
						stdio: 'ignore',
					});

					const gitPath = path.join(projectName, '.git');
					if (fs.existsSync(gitPath)) {
						spinner.setSpinnerTitle(chalk.blue('%s 🧹 Cleaning up git history...'));
						fs.rmSync(gitPath, { recursive: true, force: true });
					}

					spinner.setSpinnerTitle(
						chalk.blue('%s 🔧 Initializing new git repository...')
					);
					execSync('git init', { cwd: projectName, stdio: 'ignore' });
				}

				spinner.stop(true);

				log(chalk.green('\n✅ Project created successfully!'));
				log(boxen(chalk.cyan(`📁 Next steps:\n\n`) +
					(!isCurrentDir
						? chalk.cyan(`   cd ${projectName}\n`)
						: '') +
					chalk.cyan(`   npm install\n`) +
					chalk.cyan(`   📖 Check the README.md for setup instructions`),
					{
						padding: 1,
						margin: 1,
						borderStyle: 'round',
						borderColor: 'green',
						backgroundColor: '#222',
					}
				));

				log(chalk.hex('#FFA500')('\n🎉 Happy coding!'));
			} catch (error) {
				spinner.stop(true);
				throw error;
			}
		} catch (error) {
			log(chalk.red('❌ Error creating project:'), error);
		}
	});

program
	.command('list')
	.description('List available project templates')
	.action(() => {
		showWelcome();

		log(chalk.hex('#FFA500')('📋 Available project templates:\n'));

		Object.entries(templates).forEach(([key, config]) => {
			log(chalk.hex('#4FD6D9')(`📁 ${chalk.bold(config.name)}`));
			log(chalk.gray(`   Repository: ${config.repo} \n`));
		});

		log(boxen(chalk.cyan('Run "scaffold create" to start a new project!'),
			{
				padding: 1,
				margin: 1,
				borderStyle: 'round',
				borderColor: 'cyan',
			}
		));
	});

program.on('command:*', () => {
	log(chalk.red('❌ Invalid command:'), program.args.join(' '));
	log(chalk.cyan('See --help for a list of available commands.'));
	process.exit(1);
});

program.parse();
