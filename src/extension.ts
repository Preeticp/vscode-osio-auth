import * as vscode from "vscode";
import { BrowserContentProvider } from "./browserContentProvider";
import { Server } from "./server";
import { Utility } from "./utility";

import  {ApiServer} from "./server-api";

export function activate(context: vscode.ExtensionContext) {
    // start web server
    startServer();
    let apiServer = new ApiServer(context);
    apiServer.start();

    // provider settings.
    const provider = new BrowserContentProvider();
    const registration = vscode.workspace.registerTextDocumentContentProvider("http", provider);
    vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (e.document === vscode.window.activeTextEditor.document) {
            const previewUri = Utility.getUriOfActiveEditor();
            provider.update(previewUri);
        }
    });

    // When configuration is changed, resume web server.
    vscode.workspace.onDidChangeConfiguration(() => {
        const settings = vscode.workspace.getConfiguration("previewServer")
                            .get("isWatchConfiguration") as boolean;
        if (settings) {
            resumeServer();
            vscode.window.showInformationMessage("Resume the Web Server.");
        }
    });

    // When file is saved, reload browser.
    vscode.workspace.onDidSaveTextDocument((e) => {
        Server.reload(e.fileName);
    });

    let disposable: any = vscode.commands.registerCommand("extension.preview", () => {
        const previewUri = Utility.getUriOfActiveEditor();
        //const previewUri = "https://auth.openshift.io/api/login?redirect=http://localhost:8080/out/src/osio-ide.html";
        // set ViewColumn
        let viewColumn: vscode.ViewColumn;
        if (vscode.window.activeTextEditor.viewColumn < 3) {
            viewColumn = vscode.window.activeTextEditor.viewColumn + 1;
        } else {
            viewColumn = 1;
        }

        return vscode.commands.executeCommand("vscode.previewHtml", previewUri, viewColumn, "Preview with WebServer").then(() => {
        }, (reason) => {
            vscode.window.showErrorMessage(reason);
        });
    });

    let disposable2: any = vscode.commands.registerCommand("extension.launch", () => {
        vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("https://auth.openshift.io/api/login?redirect=http://localhost:8080/out/src/osio-ide.html"));
    });

    let disposable3: any = vscode.commands.registerCommand("extension.stop", () => {
        Server.stop();
        vscode.window.showInformationMessage("Stop the Web Server successfully.");
    });

    let disposable4: any = vscode.commands.registerCommand("extension.resume", () => {
        resumeServer();
        vscode.window.showInformationMessage("Resume the Web Server.");
    });

    context.subscriptions.push(disposable, disposable2, disposable3, disposable4, registration);

    let api_token = context.globalState.get("osio_refrsh_tojen");
    return api_token;
}

function startServer() {
    Utility.setRandomPort();
    const options = vscode.workspace.getConfiguration("previewServer");
    const port = options.get("port") as number;
    const proxy = options.get("proxy") as string;
    const isSync = options.get("sync") as boolean;
    const rootPath = vscode.workspace.rootPath || Utility.getOpenFilePath(vscode.window.activeTextEditor.document.fileName);

    Server.start(rootPath, port, isSync, proxy);
}

function resumeServer() {
    Server.stop();
    startServer();
}

export function deactivate() {
    Server.stop();
}
