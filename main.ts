import {App, Editor, FileSystemAdapter, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import * as child from 'child_process';
import * as http from "http";
import * as path from "path";


export default class LatexSympyCalculatorPlugin extends Plugin {
	pythonServer: child.ChildProcessWithoutNullStreams;

	async onload() {
		this.pythonServer = await child.spawn('python3', [this.getServerPath()]);

		this.addCommand({
			id: 'calculate-latex',
			name: 'Calculate latex expression',
			editorCallback: this.calculatorFactory(ServerOption.Latex),
		});

		this.addCommand({
			id: 'factor',
			name: 'Factor',
			editorCallback: this.calculatorFactory(ServerOption.Factor),
		});

		this.addCommand({
			id: 'Numerical',
			name: 'Numerical',
			editorCallback: this.calculatorFactory(ServerOption.Numerical),
		});

		this.addCommand({
			id: 'expand',
			name: 'Expand',
			editorCallback: this.calculatorFactory(ServerOption.Expand),
		});

		this.addCommand({
			id: 'get-matrix-raw-echelon-form',
			name: 'Get matrix raw echelon form',
			editorCallback: this.calculatorFactory(ServerOption.MatrixRawEchelonForm),
		});
	}

	onunload() {
		this.pythonServer.kill('SIGINT');
	}

	calculatorFactory(option: ServerOption) {
		return (editor: Editor, view: MarkdownView) => {
			post(editor.getSelection(), option,
				(data: string) => editor.replaceSelection(data),
				(err) => new Notice(err));
		}
	}

	getServerPath() {
		const adapter = app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			return path.join(adapter.getBasePath(),
				'.obsidian', 'plugins', 'obsidian-latex-calculator', 'sympy-server.py');
		}
		return "";
	}
}

enum ServerOption {
	Latex = '/latex',
	MatrixRawEchelonForm ='/matrix-raw-echelon-form',
	Factor = '/factor',
	Numerical = '/numerical',
	Expand = '/expand',
}

function post(data: string, path: ServerOption, onSuccess: Function, onError: Function) {
	const _data = JSON.stringify({data: data});

	const options = {
		hostname: '127.0.0.1',
		port: 7395,
		path: path,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': _data.length,
		},
	};

	const req = http.request(options, res => {
		res.on('data', data => {
			const result = JSON.parse(data);
			if (result.error) {
				onError(result.error);
			} else {
				onSuccess(result.data);
			}
		});
	});

	req.on('error', () => {
		console.log('Activating the server...\nPlease retry for a moment.');
	});

	req.write(_data);
	req.end();
}
