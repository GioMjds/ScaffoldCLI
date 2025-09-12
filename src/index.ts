#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TemplateConfig {
	name: string;
	repo: string;
}

interface Templates {
	[key: string]: TemplateConfig;
}

const program = new Command();
const log = console.log;

const templates: Templates = {
    'pern-stack': {
        name: 'PERN Stack (PostgreSQL, Express, React, Node.js)',
        repo: 'https://github.com/GioMjds/pern-stack-template.git',
    },
	'react-flask': {
		name: 'React + Flask',
		repo: 'https://github.com/GioMjds/react-flask-template.git',
	},
	'react-tanstack-router-django': {
		name: 'React (TanStack Router) + Django',
		repo: 'https://github.com/GioMjds/react-django-template.git',
	},
	'react-tanstack-router-fastapi': {
		name: 'React (TanStack Router) + FastAPI',
		repo: 'https://github.com/GioMjds/react-fastapi-template.git',
	},
	nextjs: {
		name: 'Next.js 15 App Router + API Routes',
		repo: 'https://github.com/GioMjds/nextjs-project-template.git',
	},
};

program
	.name('giomjds-template-cli')
	.description('CLI to create projects from GioMjds\'s predefined templates')
	.version('1.2.7');

program
	.command('create')
	.description('Create a new project from available project templates')
	.action(async () => {
		try {
			log(chalk.blue('🚀 Welcome to Project Template CLI!\n'));

			const templateAnswer = await inquirer.prompt<{ template: string }>([
				{
					type: 'list',
					name: 'template',
					message: 'What template would you like to use?',
					choices: Object.entries(templates).map(([key, value]) => ({
						name: value.name,
						value: key,
					})),
				},
			]);

			const selectedTemplate = templates[templateAnswer.template];
			log(chalk.green(`✨ Selected: ${selectedTemplate.name}\n`));

			const projectAnswer = await inquirer.prompt<{
				projectName: string;
			}>([
				{
					type: 'input',
					name: 'projectName',
					message: 'What is your project named?',
					default: 'my-app',
					validate: (input: string) => {
						const trimmed = input.trim();
						if (!trimmed) {
							return 'Project name cannot be empty';
						}
						if (trimmed === '.' || trimmed === './') {
							return true;
						}
						if (fs.existsSync(trimmed)) {
							return `Directory '${trimmed}' already exists!`;
						}
						if (!/^[a-zA-Z0-9._/-]+$/.test(trimmed)) {
							return 'Project name contains invalid characters';
						}
						return true;
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
							message: 'Current directory is not empty. Continue anyway?',
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
				: `"${projectName}"`;
			const confirmAnswer = await inquirer.prompt<{ confirm: boolean }>([
				{
					type: 'confirm',
					name: 'confirm',
					message: `Create project in ${displayName} with ${selectedTemplate.name}?`,
					default: true,
				},
			]);

			if (!confirmAnswer.confirm) {
				log(chalk.yellow('❌ Project creation cancelled.'));
				return;
			}

			log(chalk.blue(`\n📦 Cloning ${selectedTemplate.name}...`));

			if (isCurrentDir) {
				const tempDir = `temp-${Date.now()}`;
				execSync(`git clone ${selectedTemplate.repo} ${tempDir}`, {
					stdio: 'inherit',
				});

				const tempPath = path.resolve(tempDir);
				const files = fs.readdirSync(tempPath);

				log(chalk.blue('📁 Moving files to current directory...'));
				files.forEach((file) => {
					const srcPath = path.join(tempPath, file);
					const destPath = path.join('.', file);
					fs.renameSync(srcPath, destPath);
				});

				fs.rmSync(tempPath, { recursive: true, force: true });

				const gitPath = path.join('.', '.git');
				if (fs.existsSync(gitPath)) {
					log(chalk.blue('🧹 Cleaning up git history...'));
					fs.rmSync(gitPath, { recursive: true, force: true });
				}

				log(chalk.blue('🔧 Initializing new git repository...'));
				execSync('git init', { stdio: 'inherit' });
			} else {
				execSync(`git clone ${selectedTemplate.repo} ${projectName}`, {
					stdio: 'inherit',
				});

				const gitPath = path.join(projectName, '.git');
				if (fs.existsSync(gitPath)) {
					log(chalk.blue('🧹 Cleaning up git history...'));
					fs.rmSync(gitPath, { recursive: true, force: true });
				}

				log(chalk.blue('🔧 Initializing new git repository...'));
				execSync('git init', { cwd: projectName, stdio: 'inherit' });
			}

			log(chalk.green(`\n✅ Project created successfully!`));
			log(chalk.cyan(`\n📁 Next steps:`));

			if (!isCurrentDir) {
				log(chalk.cyan(`   cd ${projectName}`));
			}
			log(chalk.cyan(`   📖 Check the README.md for setup instructions`));
		} catch (error) {
			log(chalk.red('❌ Error creating project:'), error);
		}
	});

program
	.command('list')
	.description('List available project templates')
	.action(() => {
		log(chalk.blue('📋 Available project templates:\n'));
		Object.entries(templates).forEach(([key, config]) => {
			log(chalk.green(`• ${config.name}`));
			log(chalk.gray(`  Repository: ${config.repo} \n`));
		});
	});

program.parse();
