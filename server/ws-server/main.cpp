/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Joshua Netterfield <joshua@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#include <QCoreApplication>
#include <QCommandLineParser>
#include <QProcess>
#include <QDir>
#include "hacklilyserver.h"

int main(int argc, char *argv[]) {
    QCoreApplication app(argc, argv);

    /*
     * CLI Arguments
     */

    QCoreApplication::setApplicationName("hacklily-ws-server");
    QCoreApplication::setApplicationVersion("0.1");

    QCommandLineParser parser;

    parser.setApplicationDescription("Frontend of the Hacklily server");
    parser.addHelpOption();
    parser.addVersionOption();
    QCommandLineOption rendererPathOption("renderer-path",
        QCoreApplication::translate("main", "Path of a folder that has the renderer's Dockerfile"), "dir");

    QCommandLineOption tagOption("renderer-docker-tag",
        QCoreApplication::translate("main", "Arbitrary tag the renderer docker image should be set to (e.g., hacklily-renderer)"), "tag");

    QCommandLineOption clientIDOption("github-client-id",
        QCoreApplication::translate("main", "ID of GitHub application for this deployment of Hacklily, if running as a coordinator"), "clid");

    QCommandLineOption secretOption("github-secret",
        QCoreApplication::translate("main", "Secret for the GitHub application for this deployment of Hacklily, if running as a coordinator"), "secret");

    QCommandLineOption adminTokenOption("github-admin-token",
        QCoreApplication::translate("main", "PAT for an admin of github-org, if running as a coordinator"), "admintoken");

    QCommandLineOption orgOption("github-org",
        QCoreApplication::translate("main", "Organization under which Hacklily songs live, if running as a coordinator."), "org");

    QCommandLineOption travisAdminTokenOption("travis-admin-token",
        QCoreApplication::translate("main", "Secret for the Travis application for this deployment of Hacklily, if running as a coordinator"), "travistoken");

    QCommandLineOption portOption("ws-port",
        QCoreApplication::translate("main", "Port under which to run the WebSocket server, if running as a coordinator."), "port");

    QCommandLineOption coordinatorOption("coordinator",
        QCoreApplication::translate("main", "Address of the WebSocket to run requests for, if running as a worker."), "port");

    QCommandLineOption jobsOption("jobs",
        QCoreApplication::translate("main", "How many lilypond jobs to run at once (each job typically requires 1 CPU and 0.9 GB RAM)"), "jobs");

    parser.addOption(rendererPathOption);
    parser.addOption(tagOption);
    parser.addOption(clientIDOption);
    parser.addOption(secretOption);
    parser.addOption(adminTokenOption);
    parser.addOption(orgOption);
    parser.addOption(travisAdminTokenOption);
    parser.addOption(portOption);
    parser.addOption(coordinatorOption);
    parser.addOption(jobsOption);
    parser.process(app);
    if (!parser.isSet("renderer-path")) {
        qDebug() << "--renderer-path must be set. See --help.\n";
        parser.showHelp(1);
    }

    QDir rendererPath(parser.value("renderer-path"));
    if (!rendererPath.exists()) {
        qDebug() << "--renderer-path must point to an existing directory.\n";
        parser.showHelp(1);
    }

    if (!parser.isSet("renderer-docker-tag")) {
        qDebug() << "--renderer-docker-tag must be set.\n";
        parser.showHelp(1);
    }

    QString rendererDockerTag = parser.value("renderer-docker-tag");

    if (!parser.isSet("jobs")) {
        qDebug() << "--jobs must be set. See --help.\n";
        parser.showHelp();
    }
    bool ok;
    int jobs = parser.value("jobs").toInt(&ok);
    if (!ok) {
        qDebug() << "--jobs must be an integer. See --help.\n";
        parser.showHelp();
    }

    if (jobs > 0) {
        /*
         * Build the renderer docker image
         */
        qDebug() << "Building renderer from " << rendererPath.absolutePath();
        QProcess compileRenderer;

        compileRenderer.start("docker",
            QStringList() << "build" << rendererPath.absolutePath() << "-t" << rendererDockerTag);
        compileRenderer.waitForFinished(-1);
        if (compileRenderer.exitStatus() != QProcess::NormalExit || compileRenderer.exitCode() != 0) {
            qWarning() << compileRenderer.errorString();
            qFatal("Failed to build hacklily-renderer docker image.");
        }
    }

    if (parser.isSet("ws-port")) {
        QString wsPortStr = parser.value("ws-port");
        bool ok;
        int wsPort = wsPortStr.toInt(&ok);
        if (!ok) {
            qDebug() << "--ws-port must be an integer. See --help.\n";
            parser.showHelp(1);
        }

        QString ghClientID = parser.value("github-client-id");
        QString ghSecret = parser.value("github-secret");
        QString ghAdminToken = parser.value("github-admin-token");
        QString ghOrg = parser.value("github-org");
        QString travisAdminToken = parser.value("travis-admin-token");
        HacklilyServer server(
            rendererDockerTag,
            wsPort,
            ghClientID.toLocal8Bit(),
            ghSecret.toLocal8Bit(),
            ghAdminToken.toLocal8Bit(),
            ghOrg,
            travisAdminToken.toLocal8Bit(),
            jobs);
        return app.exec();
    } else if (parser.isSet("coordinator")) {
        QString coordinator = parser.value("coordinator");
        HacklilyServer server(rendererDockerTag, coordinator, jobs);
        return app.exec();
    } else {
        qDebug() << "--ws-port or --coordinator must be set.\n";
        parser.showHelp(1);
    }

}
