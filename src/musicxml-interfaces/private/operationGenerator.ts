// Based on https://github.com/SitePen/dts-generator

import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as os from "os";
import * as pathUtil from "path";
import * as ts from "typescript";
import { flatten, find } from "lodash";

type SyntaxKind = ts.SyntaxKind;
const SyntaxKind = ts.SyntaxKind;

/* This node type appears to not be available in 1.6-beta, so "recreating" */
interface StringLiteralTypeNode extends ts.TypeNode {
  text: string;
}

export interface Options {
  files?: string[];
  exclude?: string[];
  externs?: string[];
  eol?: string;
  includes?: string[];
  moduleResolution?: ts.ModuleResolutionKind;
  out: string;
  outDir?: string;
  target?: ts.ScriptTarget;
  sendMessage?: (message: any, ...optionalParams: any[]) => void;
  verbose?: boolean;
}

const filenameToMid: (filename: string) => string = (function () {
  if (pathUtil.sep === "/") {
    return function (filename: string) {
      return filename;
    };
  } else {
    const separatorExpression = new RegExp(
      pathUtil.sep.replace("\\", "\\\\"),
      "g"
    );
    return function (filename: string) {
      return filename.replace(separatorExpression, "/");
    };
  }
})();

function getFilenames(files: string[]): string[] {
  return files.map(function (filename) {
    const resolvedFilename = pathUtil.resolve(filename);
    return resolvedFilename;
  });
}

function getMembers(members: ts.NodeArray<ts.Node>) {
  return members.map((member) => {
    switch (member.kind) {
      case ts.SyntaxKind.PropertySignature:
        let pdNode = member as ts.PropertyDeclaration;
        let type = getTypeSpec(pdNode);
        type.required = !pdNode.questionToken;
        return type;
      case ts.SyntaxKind.IndexSignature:
        let sigNode = member as ts.IndexSignatureDeclaration;
        return {
          kind: "IndexSignature",
          required: false,
          in: sigNode.parameters.map((param) => getType(param.type)),
          out: getType(sigNode.type),
        };
      default:
        return (
          "I don't know how to handle Type literal type " +
          SyntaxKind[member.kind] +
          ". " +
          "Why not submit a PR?"
        );
    }
  });
}

function getEnumMembers(members: ts.NodeArray<ts.Node>) {
  return members.map((member) => {
    switch (member.kind) {
      case ts.SyntaxKind.EnumMember:
        let enNode = member as ts.EnumMember;
        return {
          kind: "EnumMember",
          name: (enNode.name as ts.Identifier).text,
          value: getExpression(enNode.initializer),
        };
      default:
        return (
          "I don't know how to handle enum subtype " +
          SyntaxKind[member.kind] +
          ". " +
          "Why not submit a PR?"
        );
    }
  });
}

function getExpression(node: ts.Expression): any {
  switch (node.kind) {
    case ts.SyntaxKind.FirstLiteralToken:
      return (node as ts.LiteralExpression).text;
    default:
      return (
        "I don't know how to handle expression subtype " +
        SyntaxKind[node.kind] +
        ". Why not submit " +
        "a PR?"
      );
  }
}

function getType(node: ts.Node): any {
  switch (node.kind) {
    case ts.SyntaxKind.TypeReference:
      let trNode = node as ts.TypeReferenceNode;
      if ("right" in trNode.typeName) {
        return (trNode.typeName as ts.QualifiedName).right.text;
      } else {
        return (trNode.typeName as ts.Identifier).text;
      }
    case ts.SyntaxKind.StringKeyword:
      return "string";
    case ts.SyntaxKind.NumberKeyword:
      return "number";
    case ts.SyntaxKind.BooleanKeyword:
      return "boolean";
    case ts.SyntaxKind.AnyKeyword:
      return "boolean";
    case ts.SyntaxKind.ArrayType:
      let arNode = node as ts.ArrayTypeNode;
      return `${getType(arNode.elementType)}[]`;
    case ts.SyntaxKind.TypeLiteral: {
      let litNode = node as ts.TypeLiteralNode;
      return {
        kind: "typeLiteral",
        members: getMembers(litNode.members),
      };
    }
    default:
      return (
        "I don't know how to handle type " +
        SyntaxKind[node.kind] +
        ". Why not submit a PR?"
      );
  }
}

function getTypeSpec(
  decl: ts.VariableDeclaration | ts.PropertyDeclaration
): any {
  if (decl.type.kind === ts.SyntaxKind.FunctionType) {
    let fnNode = decl.type as ts.FunctionOrConstructorTypeNode;
    return {
      name: (decl.name as ts.Identifier).text,
      kind: "FunctionDeclaration", // Lies!
      in: fnNode.parameters.map((param) => getType(param.type)),
      out: getType(fnNode.type),
    };
  } else {
    return {
      name: (decl.name as ts.Identifier).text,
      kind: getType(decl.type),
    };
  }
}

function processTree(sourceFile: ts.SourceFile): any {
  let code = "";
  let cursorPosition = 0;

  function skip(node: ts.Node) {
    cursorPosition = node.end;
  }

  function readThrough(node: ts.Node) {
    code += sourceFile.text.slice(cursorPosition, node.pos);
    cursorPosition = node.pos;
  }

  function handleSymbol(node: ts.Node, implicitExport: boolean = false): any[] {
    const children = node.getChildren(sourceFile);
    let asts: any[] = [];

    const syntaxList = find(
      children,
      (child) => child.kind === ts.SyntaxKind.SyntaxList
    );
    const isExport =
      implicitExport ||
      node.modifiers?.some(
        (mod: ts.Modifier) => mod.kind === ts.SyntaxKind.ExportKeyword
      );

    if (!isExport) {
      return;
    }

    switch (node.kind) {
      case ts.SyntaxKind.FunctionDeclaration: {
        const fdNode = node as ts.FunctionDeclaration;
        // ast.children = children.map(child => visit(child)).filter(node => Boolean(node));
        let ast = {
          kind: SyntaxKind[node.kind],
          name: fdNode.name.text,
          in: fdNode.parameters.map((param) => getType(param.type)),
          out: getType(fdNode.type),
        };
        asts.push(ast);
        break;
      }
      case ts.SyntaxKind.VariableStatement: {
        const vdNode = node as ts.VariableStatement;
        asts = vdNode.declarationList.declarations.map((decl) => {
          return getTypeSpec(decl);
        });
        break;
      }
      case ts.SyntaxKind.InterfaceDeclaration: {
        const icNode = node as ts.InterfaceDeclaration;
        let ast = {
          kind: SyntaxKind[node.kind],
          name: icNode.name.text,
          members: getMembers(icNode.members),
          extends: flatten(
            icNode.heritageClauses
              ? icNode.heritageClauses.map((clause) =>
                  clause.types.map((t) => (t as any).expression.text)
                )
              : []
          ),
        };
        asts.push(ast);
        break;
      }
      case ts.SyntaxKind.ModuleDeclaration: {
        let modDec = node as ts.ModuleDeclaration;
        let ast: any = {
          name: modDec.name.text,
          symbols: flatten(
            flatten(
              children
                .filter((node) => node.kind === ts.SyntaxKind.ModuleBlock)
                .map((child) =>
                  (child as ts.ModuleBlock).statements.map((sym) =>
                    handleSymbol(sym, true)
                  )
                )
                .filter((a) => Boolean(a))
            )
          ),
        };
        asts.push(ast);
        break;
      }
      case ts.SyntaxKind.EnumDeclaration: {
        let enDec = node as ts.EnumDeclaration;
        let ast: any = {
          kind: SyntaxKind[node.kind],
          name: enDec.name.text,
          members: getEnumMembers(enDec.members),
        };
        asts.push(ast);
        break;
      }
      default: {
        let ast: any = {
          kind: SyntaxKind[node.kind],
        };
        ast.error =
          "I don't know how to handle export type " +
          SyntaxKind[node.kind] +
          ". Why not submit a PR?";
        ast.childCount = children
          .map((child) => visit(child))
          .filter((node) => Boolean(node)).length;
        asts.push(ast);
        break;
      }
    }
    return asts;
  }

  function visit(node: ts.Node): any {
    // console.log('sk', SyntaxKind[node.kind]);
    // console.log((node as any).text && (node as any).text.substr(0, 500));

    const children = node.getChildren(sourceFile);
    let ast: any = {
      kind: SyntaxKind[node.kind],
    };

    switch (node.kind) {
      case ts.SyntaxKind.SourceFile:
        return flatten(
          children.map((child) => visit(child)).filter((node) => Boolean(node))
        );
      case ts.SyntaxKind.SyntaxList:
        return children
          .map((child) => visit(child))
          .filter((node) => Boolean(node));
      case ts.SyntaxKind.ModuleDeclaration:
        let modDec = node as ts.ModuleDeclaration;
        ast.name = modDec.name.text;
        ast.symbols = flatten(
          flatten(
            children
              .filter((node) => node.kind === ts.SyntaxKind.ModuleBlock)
              .map((child) =>
                (child as ts.ModuleBlock).statements.map((sym) =>
                  handleSymbol(sym)
                )
              )
              .filter((a) => Boolean(a))
          )
        ).filter((a) => Boolean(a));
        break;
      case ts.SyntaxKind.EndOfFileToken:
        return null;
      default:
        ast = handleSymbol(node, true);
        ast.handled = false;
        // ast.childCount = children.map(child => visit(child)).filter(node => Boolean(node)).length;
        break;
    }
    return ast;
  }

  return visit(sourceFile);
}

export default function generate(options: Options): Promise<void> {
  const noop = function (message?: any, ...optionalParams: any[]): void {};
  const sendMessage = options.sendMessage || noop;
  const verboseMessage = options.verbose ? sendMessage : noop;

  const eol = options.eol || os.EOL;
  const nonEmptyLineStart = new RegExp(eol + "(?!" + eol + "|$)", "g");
  const target = options.target || ts.ScriptTarget.Latest;
  verboseMessage(`taget = ${target}`);
  const compilerOptions: ts.CompilerOptions = {
    declaration: true,
    module: ts.ModuleKind.CommonJS,
    target: target,
  };
  if (options.outDir) {
    verboseMessage(`outDir = ${options.outDir}`);
    compilerOptions.outDir = options.outDir;
  }
  if (options.moduleResolution) {
    verboseMessage(`moduleResolution = ${options.moduleResolution}`);
    compilerOptions.moduleResolution = options.moduleResolution;
  }

  const filenames = getFilenames(options.files);
  verboseMessage("filenames:");
  filenames.forEach((name) => {
    verboseMessage("  " + name);
  });
  const excludesMap: { [filename: string]: boolean } = {};

  options.exclude = options.exclude || ["node_modules/**/*.d.ts"];

  if (options.exclude) {
    verboseMessage("exclude:");
    options.exclude.forEach((name) => {
      verboseMessage("  " + name);
    });
  }

  mkdirp.sync(pathUtil.dirname(options.out));
  /* node.js typings are missing the optional mode in createWriteStream options and therefore
   * in TS 1.6 the strict object literal checking is throwing, therefore a hammer to the nut */
  const output = fs.createWriteStream(options.out, <any>{
    mode: parseInt("644", 8),
  });

  const host = ts.createCompilerHost(compilerOptions);
  const program = ts.createProgram(filenames, compilerOptions, host);
  let decls = [];

  return new Promise<void>(function (resolve, reject) {
    output.on("close", () => {
      resolve(undefined);
    });
    output.on("error", reject);

    if (options.externs) {
      options.externs.forEach(function (path: string) {
        sendMessage(`Writing external dependency ${path}`);
        output.write(`/// <reference path="${path}" />` + eol);
      });
    }

    sendMessage("processing:");
    program.getSourceFiles().some(function (sourceFile) {
      // Source file is a default library, or other dependency from another project, that should not be included in
      // our bundled output

      if (excludesMap[filenameToMid(pathUtil.normalize(sourceFile.fileName))]) {
        return;
      }

      sendMessage(`  ${sourceFile.fileName}`);

      console.assert(sourceFile.fileName.slice(-5) === ".d.ts");
      decls = decls.concat(processTree(sourceFile));
      return false;
    });

    sendMessage(`output to "${options.out}"`);
    output.write(JSON.stringify(flatten(decls), null, 2));
    output.end();
  });
}

function main(argv: string[]): Promise<number | void> {
  const kwArgs: {
    [key: string]: any;
    baseDir?: string;
    exclude?: string[];
    externs?: string[];
    files: string[];
    sendMessage?: (message: any, ...optionalParams: any[]) => void;
    verbose?: boolean;
  } = {
    files: [],
    sendMessage: console.log.bind(console),
  };

  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i];

    if (arg.charAt(0) === "-") {
      const key = argv[i].replace(/^-+/, "");
      const value = argv[i + 1];
      ++i;

      if (key === "exclude") {
        if (!kwArgs.exclude) {
          kwArgs.exclude = [];
        }

        kwArgs.exclude.push(value);
      } else if (key === "extern") {
        if (!kwArgs.externs) {
          kwArgs.externs = [];
        }

        kwArgs.externs.push(value);
      } else if (key === "verbose") {
        kwArgs.verbose = true;
        /* decrement counter, because vebose does not take a value */
        --i;
      } else {
        kwArgs[key] = value;
      }
    } else {
      kwArgs.files.push(argv[i]);
    }
  }

  if (!kwArgs["out"]) {
    console.error(`Missing required argument "out"`);
    process.exit(1);
  }

  if (kwArgs.files.length === 0) {
    console.error("Missing files");
    process.exit(1);
  }

  console.log("Starting");

  return generate(<any>kwArgs).then(function () {
    console.log("Done!");
  });
}

main(process.argv.slice(2)).then(
  function (code: number) {
    return process.exit(code || 0);
  },
  function (err) {
    throw err;
  }
);
