/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	WorkspaceChange,
	Position,
	CompletionItemKind
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import axios, {
	AxiosResponse
} from 'axios';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface SPARQLPREFIXSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: SPARQLPREFIXSettings = { maxNumberOfProblems: 1000 };
let globalSettings: SPARQLPREFIXSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<SPARQLPREFIXSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <SPARQLPREFIXSettings>(
			(change.settings.languageServerSPARQLPREFIX || defaultSettings)
		);
	}

	// Revalidate all open text documents
	//documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<SPARQLPREFIXSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerSPARQLPREFIX'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	//validateTextDocument(change.document);
	completeTextDocument(change.document);
});

async function completeTextDocument(textDocument: TextDocument): Promise<void> {

	const settings = await getDocumentSettings(textDocument.uri);

	const text = textDocument.getText();

	const prefix = new Set();
	for (const line of text.split(/[\r\n]+/)){
		if(line.substring(0, 6) == 'PREFIX' || line.substring(0, 6) == 'prefix'){
			prefix.add(line.split(' ')[1]);
		}
		else{
			const pattern = /[a-zA-Z]{2,}:(?![/]+)/g;
			let m: RegExpExecArray | null;

			const addPrefix: string[] = [];
			let problems = 0;
			while ((m = pattern.exec(line)) && problems < settings.maxNumberOfProblems) {
				problems++;
				addPrefix.push(m[0]);
			}
			if (addPrefix.length > 0){
				const workspaceChange = new WorkspaceChange();
				const textChange = workspaceChange.getTextEditChange(textDocument.uri);
				let response: AxiosResponse;
				const prefixURL: string[] = [];
				let p:string;
				for (p of addPrefix) {
					if(!prefix.has(p)){
						const URL:string = 'http://prefix.cc/' + p.substring(0, p.length-1) + '.file.sparql';
						//console.log(p.substring(0, p.length-1));
						try {
							response = await axios.get(URL);
							prefixURL.push(response.data);
							textChange.insert(Position.create(0, 0), response.data);
							prefix.add(p);
						} catch(error){
							connection.console.warn('Prefix name error.');
						}
					}else{
						continue;
					}
				}
				await connection.workspace.applyEdit(workspaceChange.edit);
			}
		}
	}
}
/*
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri);

	// The validator creates diagnostics for all uppercase words length 2 and more
	const text = textDocument.getText();
	const pattern = /[a-zA-Z]{2,}:$/g;
	let m: RegExpExecArray | null;

	let problems = 0;
	const diagnostics: Diagnostic[] = [];
	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		problems++;
		const diagnostic: Diagnostic = {
			severity: DiagnosticSeverity.Warning,
			range: {
				start: textDocument.positionAt(m.index),
				end: textDocument.positionAt(m.index + m[0].length)
			},
			message: `${m[0]} is all uppercase.`,
			source: 'ex'
		};
		diagnostics.push(diagnostic);
	}

	// Send the computed diagnostics to VSCode.
	//connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}
*/
connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	async (_textDocumentPosition: TextDocumentPositionParams): Promise<CompletionItem[]> => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		const textUri:string = _textDocumentPosition.textDocument.uri;
		const text = documents.get(textUri)?.getText();
		//console.log(text);
		if(text){
			const position :Position = _textDocumentPosition.position;
			const line: string = text.split(/[\r\n]+/)[position.line];
			let i:number = position.character-1;
			let isQuery = false;
			//console.log(position.line, position.character);
			while(line.charAt(i) != ' ' && i > 0){
				i--;
				if(line.charAt(i) == ':'){
					isQuery = true;
				}
			}
			if(i>0)i++;
			const word:string = line.substring(i, position.character+1);

			if(isQuery){
				const prefix = new Map<string, string>();
				for (const line of text.split(/[\r\n]+/)){
					if(line.substring(0, 6) == 'PREFIX' || line.substring(0, 6) == 'prefix'){
						prefix.set(line.split(' ')[1], line.split(' ')[2].substring(1, line.split(' ')[2].length-1));
					}else{
						break;
					}
				}
				
				const queryPrefix:string = word.split(':', 1)[0];
				const querySuffix:string = word.split(':', 1)[1];
				if(prefix.has(queryPrefix)){
					let response:AxiosResponse;
					const baseUrl = 'https://lov.linkeddata.es/dataset/lov/api/v2/term/autocomplete?q=';
					const query:string = prefix.get(queryPrefix)+querySuffix;
					try{
						response = await axios.get(baseUrl+query);
						if(response.data.total_results > 0){
							const result: CompletionItem[] = [];
							for(const r of response.data.results){
								result.push({
									label: queryPrefix+r.localName[0],
									kind: CompletionItemKind.Property
								});
							}
							return result;
						}
					} catch (exception) {
						connection.console.log('Bad query.');
					}
				}
			}
		}
		return [];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
