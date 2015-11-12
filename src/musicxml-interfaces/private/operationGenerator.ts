// Based on https://github.com/SitePen/dts-generator

/// <reference path="../../node_modules/typescript/lib/typescript.d.ts"/>
/// <reference path="../../typings/tsd.d.ts"/>

import * as fs from 'fs';
import * as glob from 'glob';
import * as mkdirp from 'mkdirp';
import * as os from 'os';
import * as pathUtil from 'path';
import * as Promise from 'bluebird';
import * as ts from 'typescript';
import {flatten, any, find} from 'lodash';

enum SyntaxKind {
    Unknown = 0,
    EndOfFileToken = 1,
    SingleLineCommentTrivia = 2,
    MultiLineCommentTrivia = 3,
    NewLineTrivia = 4,
    WhitespaceTrivia = 5,
    ShebangTrivia = 6,
    ConflictMarkerTrivia = 7,
    NumericLiteral = 8,
    StringLiteral = 9,
    RegularExpressionLiteral = 10,
    NoSubstitutionTemplateLiteral = 11,
    TemplateHead = 12,
    TemplateMiddle = 13,
    TemplateTail = 14,
    OpenBraceToken = 15,
    CloseBraceToken = 16,
    OpenParenToken = 17,
    CloseParenToken = 18,
    OpenBracketToken = 19,
    CloseBracketToken = 20,
    DotToken = 21,
    DotDotDotToken = 22,
    SemicolonToken = 23,
    CommaToken = 24,
    LessThanToken = 25,
    LessThanSlashToken = 26,
    GreaterThanToken = 27,
    LessThanEqualsToken = 28,
    GreaterThanEqualsToken = 29,
    EqualsEqualsToken = 30,
    ExclamationEqualsToken = 31,
    EqualsEqualsEqualsToken = 32,
    ExclamationEqualsEqualsToken = 33,
    EqualsGreaterThanToken = 34,
    PlusToken = 35,
    MinusToken = 36,
    AsteriskToken = 37,
    SlashToken = 38,
    PercentToken = 39,
    PlusPlusToken = 40,
    MinusMinusToken = 41,
    LessThanLessThanToken = 42,
    GreaterThanGreaterThanToken = 43,
    GreaterThanGreaterThanGreaterThanToken = 44,
    AmpersandToken = 45,
    BarToken = 46,
    CaretToken = 47,
    ExclamationToken = 48,
    TildeToken = 49,
    AmpersandAmpersandToken = 50,
    BarBarToken = 51,
    QuestionToken = 52,
    ColonToken = 53,
    AtToken = 54,
    EqualsToken = 55,
    PlusEqualsToken = 56,
    MinusEqualsToken = 57,
    AsteriskEqualsToken = 58,
    SlashEqualsToken = 59,
    PercentEqualsToken = 60,
    LessThanLessThanEqualsToken = 61,
    GreaterThanGreaterThanEqualsToken = 62,
    GreaterThanGreaterThanGreaterThanEqualsToken = 63,
    AmpersandEqualsToken = 64,
    BarEqualsToken = 65,
    CaretEqualsToken = 66,
    Identifier = 67,
    BreakKeyword = 68,
    CaseKeyword = 69,
    CatchKeyword = 70,
    ClassKeyword = 71,
    ConstKeyword = 72,
    ContinueKeyword = 73,
    DebuggerKeyword = 74,
    DefaultKeyword = 75,
    DeleteKeyword = 76,
    DoKeyword = 77,
    ElseKeyword = 78,
    EnumKeyword = 79,
    ExportKeyword = 80,
    ExtendsKeyword = 81,
    FalseKeyword = 82,
    FinallyKeyword = 83,
    ForKeyword = 84,
    FunctionKeyword = 85,
    IfKeyword = 86,
    ImportKeyword = 87,
    InKeyword = 88,
    InstanceOfKeyword = 89,
    NewKeyword = 90,
    NullKeyword = 91,
    ReturnKeyword = 92,
    SuperKeyword = 93,
    SwitchKeyword = 94,
    ThisKeyword = 95,
    ThrowKeyword = 96,
    TrueKeyword = 97,
    TryKeyword = 98,
    TypeOfKeyword = 99,
    VarKeyword = 100,
    VoidKeyword = 101,
    WhileKeyword = 102,
    WithKeyword = 103,
    ImplementsKeyword = 104,
    InterfaceKeyword = 105,
    LetKeyword = 106,
    PackageKeyword = 107,
    PrivateKeyword = 108,
    ProtectedKeyword = 109,
    PublicKeyword = 110,
    StaticKeyword = 111,
    YieldKeyword = 112,
    AbstractKeyword = 113,
    AsKeyword = 114,
    AnyKeyword = 115,
    AsyncKeyword = 116,
    AwaitKeyword = 117,
    BooleanKeyword = 118,
    ConstructorKeyword = 119,
    DeclareKeyword = 120,
    GetKeyword = 121,
    IsKeyword = 122,
    ModuleKeyword = 123,
    NamespaceKeyword = 124,
    RequireKeyword = 125,
    NumberKeyword = 126,
    SetKeyword = 127,
    StringKeyword = 128,
    SymbolKeyword = 129,
    TypeKeyword = 130,
    FromKeyword = 131,
    OfKeyword = 132,
    QualifiedName = 133,
    ComputedPropertyName = 134,
    TypeParameter = 135,
    Parameter = 136,
    Decorator = 137,
    PropertySignature = 138,
    PropertyDeclaration = 139,
    MethodSignature = 140,
    MethodDeclaration = 141,
    Constructor = 142,
    GetAccessor = 143,
    SetAccessor = 144,
    CallSignature = 145,
    ConstructSignature = 146,
    IndexSignature = 147,
    TypePredicate = 148,
    TypeReference = 149,
    FunctionType = 150,
    ConstructorType = 151,
    TypeQuery = 152,
    TypeLiteral = 153,
    ArrayType = 154,
    TupleType = 155,
    UnionType = 156,
    IntersectionType = 157,
    ParenthesizedType = 158,
    ObjectBindingPattern = 159,
    ArrayBindingPattern = 160,
    BindingElement = 161,
    ArrayLiteralExpression = 162,
    ObjectLiteralExpression = 163,
    PropertyAccessExpression = 164,
    ElementAccessExpression = 165,
    CallExpression = 166,
    NewExpression = 167,
    TaggedTemplateExpression = 168,
    TypeAssertionExpression = 169,
    ParenthesizedExpression = 170,
    FunctionExpression = 171,
    ArrowFunction = 172,
    DeleteExpression = 173,
    TypeOfExpression = 174,
    VoidExpression = 175,
    AwaitExpression = 176,
    PrefixUnaryExpression = 177,
    PostfixUnaryExpression = 178,
    BinaryExpression = 179,
    ConditionalExpression = 180,
    TemplateExpression = 181,
    YieldExpression = 182,
    SpreadElementExpression = 183,
    ClassExpression = 184,
    OmittedExpression = 185,
    ExpressionWithTypeArguments = 186,
    AsExpression = 187,
    TemplateSpan = 188,
    SemicolonClassElement = 189,
    Block = 190,
    VariableStatement = 191,
    EmptyStatement = 192,
    ExpressionStatement = 193,
    IfStatement = 194,
    DoStatement = 195,
    WhileStatement = 196,
    ForStatement = 197,
    ForInStatement = 198,
    ForOfStatement = 199,
    ContinueStatement = 200,
    BreakStatement = 201,
    ReturnStatement = 202,
    WithStatement = 203,
    SwitchStatement = 204,
    LabeledStatement = 205,
    ThrowStatement = 206,
    TryStatement = 207,
    DebuggerStatement = 208,
    VariableDeclaration = 209,
    VariableDeclarationList = 210,
    FunctionDeclaration = 211,
    ClassDeclaration = 212,
    InterfaceDeclaration = 213,
    TypeAliasDeclaration = 214,
    EnumDeclaration = 215,
    ModuleDeclaration = 216,
    ModuleBlock = 217,
    CaseBlock = 218,
    ImportEqualsDeclaration = 219,
    ImportDeclaration = 220,
    ImportClause = 221,
    NamespaceImport = 222,
    NamedImports = 223,
    ImportSpecifier = 224,
    ExportAssignment = 225,
    ExportDeclaration = 226,
    NamedExports = 227,
    ExportSpecifier = 228,
    MissingDeclaration = 229,
    ExternalModuleReference = 230,
    JsxElement = 231,
    JsxSelfClosingElement = 232,
    JsxOpeningElement = 233,
    JsxText = 234,
    JsxClosingElement = 235,
    JsxAttribute = 236,
    JsxSpreadAttribute = 237,
    JsxExpression = 238,
    CaseClause = 239,
    DefaultClause = 240,
    HeritageClause = 241,
    CatchClause = 242,
    PropertyAssignment = 243,
    ShorthandPropertyAssignment = 244,
    EnumMember = 245,
    SourceFile = 246,
    JSDocTypeExpression = 247,
    JSDocAllType = 248,
    JSDocUnknownType = 249,
    JSDocArrayType = 250,
    JSDocUnionType = 251,
    JSDocTupleType = 252,
    JSDocNullableType = 253,
    JSDocNonNullableType = 254,
    JSDocRecordType = 255,
    JSDocRecordMember = 256,
    JSDocTypeReference = 257,
    JSDocOptionalType = 258,
    JSDocFunctionType = 259,
    JSDocVariadicType = 260,
    JSDocConstructorType = 261,
    JSDocThisType = 262,
    JSDocComment = 263,
    JSDocTag = 264,
    JSDocParameterTag = 265,
    JSDocReturnTag = 266,
    JSDocTypeTag = 267,
    JSDocTemplateTag = 268,
    SyntaxList = 269,
    Count = 270,
    FirstAssignment = 55,
    LastAssignment = 66,
    FirstReservedWord = 68,
    LastReservedWord = 103,
    FirstKeyword = 68,
    LastKeyword = 132,
    FirstFutureReservedWord = 104,
    LastFutureReservedWord = 112,
    FirstTypeNode = 149,
    LastTypeNode = 158,
    FirstPunctuation = 15,
    LastPunctuation = 66,
    FirstToken = 0,
    LastToken = 132,
    FirstTriviaToken = 2,
    LastTriviaToken = 7,
    FirstLiteralToken = 8,
    LastLiteralToken = 11,
    FirstTemplateToken = 11,
    LastTemplateToken = 14,
    FirstBinaryOperator = 25,
    LastBinaryOperator = 66,
    FirstNode = 133,
}

/* This node type appears to not be available in 1.6-beta, so "recreating" */
interface StringLiteralTypeNode extends ts.TypeNode {
	text: string;
}

interface Options {
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
	if (pathUtil.sep === '/') {
		return function (filename: string) {
			return filename;
		};
	}
	else {
		const separatorExpression = new RegExp(pathUtil.sep.replace('\\', '\\\\'), 'g');
		return function (filename: string) {
			return filename.replace(separatorExpression, '/');
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
    return members.map(member => {
        switch (member.kind) {
            case ts.SyntaxKind.PropertySignature:
                let pdNode = (member as ts.PropertyDeclaration);
                let type = getTypeSpec(pdNode);
                type.required = !pdNode.questionToken;
                return type;
            case ts.SyntaxKind.IndexSignature:
                let sigNode = (member as ts.IndexSignatureDeclaration);
                return {
                    kind: "IndexSignature",
                    required: false,
                    in: sigNode.parameters.map(param => getType(param.type)),
                    out: getType(sigNode.type)
                };
            default:
                return "I don't know how to handle Type literal type " + SyntaxKind[member.kind] + ". " +
                    "Why not submit a PR?";
        }
    });
}

function getEnumMembers(members: ts.NodeArray<ts.Node>) {
    return members.map(member => {
        switch (member.kind) {
            case ts.SyntaxKind.EnumMember:
                let enNode = (member as ts.EnumMember);
                return {
                    kind: "EnumMember",
                    name: (enNode.name as ts.Identifier).text,
                    value: getExpression(enNode.initializer)
                }
            default:
                return "I don't know how to handle enum subtype " + SyntaxKind[member.kind] + ". " +
                    "Why not submit a PR?";
        }
    });
}

function getExpression(node: ts.Expression): any {
    switch (node.kind) {
        case ts.SyntaxKind.FirstLiteralToken:
            return (node as ts.LiteralExpression).text
        default:
            return "I don't know how to handle expression subtype " + SyntaxKind[node.kind] + ". Why not submit " +
                "a PR?";
    }
}

function getType(node: ts.Node): any {
    switch(node.kind) {
        case ts.SyntaxKind.TypeReference:
            let trNode = node as ts.TypeReferenceNode;
            if ("right" in trNode.typeName) {
                return (trNode.typeName as ts.QualifiedName).right.text;  
            } else {
                return (trNode.typeName as ts.Identifier).text;
            }
            break;
        case ts.SyntaxKind.StringKeyword:
            return "string";
            break;
        case ts.SyntaxKind.NumberKeyword:
            return "number";
            break;
        case ts.SyntaxKind.BooleanKeyword:
            return "boolean";
            break;
        case ts.SyntaxKind.AnyKeyword:
            return "boolean";
            break;
        case ts.SyntaxKind.ArrayType:
            let arNode = node as ts.ArrayTypeNode;
            return `${getType(arNode.elementType)}[]`;
            break;
        case ts.SyntaxKind.TypeLiteral: {
            let litNode = node as ts.TypeLiteralNode;
            return {
                kind: "typeLiteral",
                members: getMembers(litNode.members)
            };
        }
        default:
            return "I don't know how to handle type " + SyntaxKind[node.kind] + ". Why not submit a PR?";
            break;
    }
}

function getTypeSpec(decl: ts.VariableDeclaration | ts.PropertyDeclaration): any {
    if (decl.type.kind === ts.SyntaxKind.FunctionType) {
        let fnNode = decl.type as ts.FunctionOrConstructorTypeNode;
        return {
            name: (decl.name as ts.Identifier).text,
            kind: "FunctionDeclaration", // Lies!
            in: fnNode.parameters.map(param => getType(param.type)),
            out: getType(fnNode.type)
        }; 
    } else {
        return {
            name: (decl.name as ts.Identifier).text,
            kind: getType(decl.type)
        }   
    }
}

function processTree(sourceFile: ts.SourceFile): any {
	let code = '';
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
        
        const syntaxList = find(children, child => child.kind === ts.SyntaxKind.SyntaxList);
        const isExport = implicitExport || Boolean(node.flags & ts.NodeFlags.Export);
        
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
                    in: fdNode.parameters.map(param => getType(param.type)),
                    out: getType(fdNode.type)
                };
                asts.push(ast);
                break;
            }
            case ts.SyntaxKind.VariableStatement: {
                const vdNode = node as ts.VariableStatement;
                asts = vdNode.declarationList.declarations.map(decl => {
                    return getTypeSpec(decl);
                });
                break;
            }
            case ts.SyntaxKind.InterfaceDeclaration: {
                const icNode = (node as ts.InterfaceDeclaration);
                let ast = {
                    kind: SyntaxKind[node.kind],
                    name: icNode.name.text,
                    members: getMembers(icNode.members),
                    extends: flatten(icNode.heritageClauses ? icNode.heritageClauses.map(clause =>
                            (clause.types.map(t => (t as any).expression.text))) : [])
                };
                asts.push(ast);
                break;
            }
            case ts.SyntaxKind.ModuleDeclaration: {
                let modDec = (node as ts.ModuleDeclaration);
                let ast: any = {
                    name: modDec.name.text,
                    symbols: flatten(flatten(
                        children.filter(node => node.kind === ts.SyntaxKind.ModuleBlock).map(child =>
                        (child as ts.ModuleBlock).statements.map(sym => handleSymbol(sym, true))).filter(a => Boolean(a))))
                };
                asts.push(ast);
                break;
            }
            case ts.SyntaxKind.EnumDeclaration: {
                let enDec = (node as ts.EnumDeclaration);
                let ast: any = {
                    kind: SyntaxKind[node.kind],
                    name: enDec.name.text,
                    members: getEnumMembers(enDec.members)
                }
                asts.push(ast);
                break;
            }
            default: {
                let ast: any = {
                    kind: SyntaxKind[node.kind]
                }
                ast.error = "I don't know how to handle export type " + SyntaxKind[node.kind] + ". Why not submit a PR?";
                ast.childCount = children.map(child => visit(child)).filter(node => Boolean(node)).length;
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
            kind: SyntaxKind[node.kind]
        };

        switch (node.kind) {
            case ts.SyntaxKind.SourceFile:
                return flatten(children.map(child => visit(child)).filter(node => Boolean(node)));
                break;
            case ts.SyntaxKind.SyntaxList:
                return children.map(child => visit(child)).filter(node => Boolean(node));
                break;
            case ts.SyntaxKind.ModuleDeclaration:
                let modDec = (node as ts.ModuleDeclaration);
                ast.name = modDec.name.text;
                ast.symbols = flatten(flatten(
                    children.filter(node => node.kind === ts.SyntaxKind.ModuleBlock).map(child =>
                    (child as ts.ModuleBlock).statements.map(sym => handleSymbol(sym))).filter(a => Boolean(a))))
                    .filter(a => Boolean(a));
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
	const nonEmptyLineStart = new RegExp(eol + '(?!' + eol + '|$)', 'g');
	const target = options.target || ts.ScriptTarget.Latest;
	verboseMessage(`taget = ${target}`);
	const compilerOptions: ts.CompilerOptions = {
		declaration: true,
		module: ts.ModuleKind.CommonJS,
		target: target
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
	verboseMessage('filenames:');
	filenames.forEach(name => { verboseMessage('  ' + name); });
	const excludesMap: { [filename: string]: boolean; } = {};

	options.exclude = options.exclude || [ 'node_modules/**/*.d.ts' ];

	if (options.exclude) {
		verboseMessage('exclude:');
		options.exclude.forEach(name => { verboseMessage('  ' + name); });
	}

	mkdirp.sync(pathUtil.dirname(options.out));
	/* node.js typings are missing the optional mode in createWriteStream options and therefore
	 * in TS 1.6 the strict object literal checking is throwing, therefore a hammer to the nut */
	const output = fs.createWriteStream(options.out, <any> { mode: parseInt('644', 8) });

	const host = ts.createCompilerHost(compilerOptions);
	const program = ts.createProgram(filenames, compilerOptions, host);
    let decls = [];

	return new Promise<void>(function (resolve, reject) {
		output.on('close', () => { resolve(undefined); });
		output.on('error', reject);

		if (options.externs) {
			options.externs.forEach(function (path: string) {
				sendMessage(`Writing external dependency ${path}`);
				output.write(`/// <reference path="${path}" />` + eol);
			});
		}

		sendMessage('processing:');
		program.getSourceFiles().some(function (sourceFile) {
			// Source file is a default library, or other dependency from another project, that should not be included in
			// our bundled output

			if (excludesMap[filenameToMid(pathUtil.normalize(sourceFile.fileName))]) {
				return;
			}

			sendMessage(`  ${sourceFile.fileName}`);

			console.assert(sourceFile.fileName.slice(-5) === '.d.ts');
            decls = decls.concat(processTree(sourceFile));
            return false;
		});

		sendMessage(`output to "${options.out}"`)
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
		sendMessage: console.log.bind(console)
	};

	for (let i = 0; i < argv.length; ++i) {
		const arg = argv[i];

		if (arg.charAt(0) === '-') {
			const key = argv[i].replace(/^-+/, '');
			const value = argv[i + 1];
			++i;

			if (key === 'exclude') {
				if (!kwArgs.exclude) {
					kwArgs.exclude = [];
				}

				kwArgs.exclude.push(value);
			}
			else if (key === 'extern') {
				if (!kwArgs.externs) {
					kwArgs.externs = [];
				}

				kwArgs.externs.push(value);
			}
			else if (key === 'verbose') {
				kwArgs.verbose = true;
				/* decrement counter, because vebose does not take a value */
				--i;
			}
			else {
				kwArgs[key] = value;
			}
		}
		else {
			kwArgs.files.push(argv[i]);
		}
	}

    if (!kwArgs['out']) {
        console.error(`Missing required argument "out"`);
        process.exit(1);
    }

	if (kwArgs.files.length === 0) {
		console.error('Missing files');
		process.exit(1);
	}

	console.log('Starting');

	return generate(<any> kwArgs).then(function () {
		console.log('Done!');
	});
}

main(process.argv.slice(2)).then(function (code: number) {
    return process.exit(code || 0);
}, function (err) {
    throw err;
});
