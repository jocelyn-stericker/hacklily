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
    AsteriskAsteriskToken = 38,
    SlashToken = 39,
    PercentToken = 40,
    PlusPlusToken = 41,
    MinusMinusToken = 42,
    LessThanLessThanToken = 43,
    GreaterThanGreaterThanToken = 44,
    GreaterThanGreaterThanGreaterThanToken = 45,
    AmpersandToken = 46,
    BarToken = 47,
    CaretToken = 48,
    ExclamationToken = 49,
    TildeToken = 50,
    AmpersandAmpersandToken = 51,
    BarBarToken = 52,
    QuestionToken = 53,
    ColonToken = 54,
    AtToken = 55,
    EqualsToken = 56,
    PlusEqualsToken = 57,
    MinusEqualsToken = 58,
    AsteriskEqualsToken = 59,
    AsteriskAsteriskEqualsToken = 60,
    SlashEqualsToken = 61,
    PercentEqualsToken = 62,
    LessThanLessThanEqualsToken = 63,
    GreaterThanGreaterThanEqualsToken = 64,
    GreaterThanGreaterThanGreaterThanEqualsToken = 65,
    AmpersandEqualsToken = 66,
    BarEqualsToken = 67,
    CaretEqualsToken = 68,
    Identifier = 69,
    BreakKeyword = 70,
    CaseKeyword = 71,
    CatchKeyword = 72,
    ClassKeyword = 73,
    ConstKeyword = 74,
    ContinueKeyword = 75,
    DebuggerKeyword = 76,
    DefaultKeyword = 77,
    DeleteKeyword = 78,
    DoKeyword = 79,
    ElseKeyword = 80,
    EnumKeyword = 81,
    ExportKeyword = 82,
    ExtendsKeyword = 83,
    FalseKeyword = 84,
    FinallyKeyword = 85,
    ForKeyword = 86,
    FunctionKeyword = 87,
    IfKeyword = 88,
    ImportKeyword = 89,
    InKeyword = 90,
    InstanceOfKeyword = 91,
    NewKeyword = 92,
    NullKeyword = 93,
    ReturnKeyword = 94,
    SuperKeyword = 95,
    SwitchKeyword = 96,
    ThisKeyword = 97,
    ThrowKeyword = 98,
    TrueKeyword = 99,
    TryKeyword = 100,
    TypeOfKeyword = 101,
    VarKeyword = 102,
    VoidKeyword = 103,
    WhileKeyword = 104,
    WithKeyword = 105,
    ImplementsKeyword = 106,
    InterfaceKeyword = 107,
    LetKeyword = 108,
    PackageKeyword = 109,
    PrivateKeyword = 110,
    ProtectedKeyword = 111,
    PublicKeyword = 112,
    StaticKeyword = 113,
    YieldKeyword = 114,
    AbstractKeyword = 115,
    AsKeyword = 116,
    AnyKeyword = 117,
    AsyncKeyword = 118,
    AwaitKeyword = 119,
    BooleanKeyword = 120,
    ConstructorKeyword = 121,
    DeclareKeyword = 122,
    GetKeyword = 123,
    IsKeyword = 124,
    ModuleKeyword = 125,
    NamespaceKeyword = 126,
    NeverKeyword = 127,
    ReadonlyKeyword = 128,
    RequireKeyword = 129,
    NumberKeyword = 130,
    SetKeyword = 131,
    StringKeyword = 132,
    SymbolKeyword = 133,
    TypeKeyword = 134,
    UndefinedKeyword = 135,
    FromKeyword = 136,
    GlobalKeyword = 137,
    OfKeyword = 138,
    QualifiedName = 139,
    ComputedPropertyName = 140,
    TypeParameter = 141,
    Parameter = 142,
    Decorator = 143,
    PropertySignature = 144,
    PropertyDeclaration = 145,
    MethodSignature = 146,
    MethodDeclaration = 147,
    Constructor = 148,
    GetAccessor = 149,
    SetAccessor = 150,
    CallSignature = 151,
    ConstructSignature = 152,
    IndexSignature = 153,
    TypePredicate = 154,
    TypeReference = 155,
    FunctionType = 156,
    ConstructorType = 157,
    TypeQuery = 158,
    TypeLiteral = 159,
    ArrayType = 160,
    TupleType = 161,
    UnionType = 162,
    IntersectionType = 163,
    ParenthesizedType = 164,
    ThisType = 165,
    StringLiteralType = 166,
    ObjectBindingPattern = 167,
    ArrayBindingPattern = 168,
    BindingElement = 169,
    ArrayLiteralExpression = 170,
    ObjectLiteralExpression = 171,
    PropertyAccessExpression = 172,
    ElementAccessExpression = 173,
    CallExpression = 174,
    NewExpression = 175,
    TaggedTemplateExpression = 176,
    TypeAssertionExpression = 177,
    ParenthesizedExpression = 178,
    FunctionExpression = 179,
    ArrowFunction = 180,
    DeleteExpression = 181,
    TypeOfExpression = 182,
    VoidExpression = 183,
    AwaitExpression = 184,
    PrefixUnaryExpression = 185,
    PostfixUnaryExpression = 186,
    BinaryExpression = 187,
    ConditionalExpression = 188,
    TemplateExpression = 189,
    YieldExpression = 190,
    SpreadElementExpression = 191,
    ClassExpression = 192,
    OmittedExpression = 193,
    ExpressionWithTypeArguments = 194,
    AsExpression = 195,
    NonNullExpression = 196,
    TemplateSpan = 197,
    SemicolonClassElement = 198,
    Block = 199,
    VariableStatement = 200,
    EmptyStatement = 201,
    ExpressionStatement = 202,
    IfStatement = 203,
    DoStatement = 204,
    WhileStatement = 205,
    ForStatement = 206,
    ForInStatement = 207,
    ForOfStatement = 208,
    ContinueStatement = 209,
    BreakStatement = 210,
    ReturnStatement = 211,
    WithStatement = 212,
    SwitchStatement = 213,
    LabeledStatement = 214,
    ThrowStatement = 215,
    TryStatement = 216,
    DebuggerStatement = 217,
    VariableDeclaration = 218,
    VariableDeclarationList = 219,
    FunctionDeclaration = 220,
    ClassDeclaration = 221,
    InterfaceDeclaration = 222,
    TypeAliasDeclaration = 223,
    EnumDeclaration = 224,
    ModuleDeclaration = 225,
    ModuleBlock = 226,
    CaseBlock = 227,
    NamespaceExportDeclaration = 228,
    ImportEqualsDeclaration = 229,
    ImportDeclaration = 230,
    ImportClause = 231,
    NamespaceImport = 232,
    NamedImports = 233,
    ImportSpecifier = 234,
    ExportAssignment = 235,
    ExportDeclaration = 236,
    NamedExports = 237,
    ExportSpecifier = 238,
    MissingDeclaration = 239,
    ExternalModuleReference = 240,
    JsxElement = 241,
    JsxSelfClosingElement = 242,
    JsxOpeningElement = 243,
    JsxText = 244,
    JsxClosingElement = 245,
    JsxAttribute = 246,
    JsxSpreadAttribute = 247,
    JsxExpression = 248,
    CaseClause = 249,
    DefaultClause = 250,
    HeritageClause = 251,
    CatchClause = 252,
    PropertyAssignment = 253,
    ShorthandPropertyAssignment = 254,
    EnumMember = 255,
    SourceFile = 256,
    JSDocTypeExpression = 257,
    JSDocAllType = 258,
    JSDocUnknownType = 259,
    JSDocArrayType = 260,
    JSDocUnionType = 261,
    JSDocTupleType = 262,
    JSDocNullableType = 263,
    JSDocNonNullableType = 264,
    JSDocRecordType = 265,
    JSDocRecordMember = 266,
    JSDocTypeReference = 267,
    JSDocOptionalType = 268,
    JSDocFunctionType = 269,
    JSDocVariadicType = 270,
    JSDocConstructorType = 271,
    JSDocThisType = 272,
    JSDocComment = 273,
    JSDocTag = 274,
    JSDocParameterTag = 275,
    JSDocReturnTag = 276,
    JSDocTypeTag = 277,
    JSDocTemplateTag = 278,
    JSDocTypedefTag = 279,
    JSDocPropertyTag = 280,
    JSDocTypeLiteral = 281,
    SyntaxList = 282,
    Count = 283,
    FirstAssignment = 56,
    LastAssignment = 68,
    FirstReservedWord = 70,
    LastReservedWord = 105,
    FirstKeyword = 70,
    LastKeyword = 138,
    FirstFutureReservedWord = 106,
    LastFutureReservedWord = 114,
    FirstTypeNode = 154,
    LastTypeNode = 166,
    FirstPunctuation = 15,
    LastPunctuation = 68,
    FirstToken = 0,
    LastToken = 138,
    FirstTriviaToken = 2,
    LastTriviaToken = 7,
    FirstLiteralToken = 8,
    LastLiteralToken = 11,
    FirstTemplateToken = 11,
    LastTemplateToken = 14,
    FirstBinaryOperator = 25,
    LastBinaryOperator = 68,
    FirstNode = 139,
    FirstJSDocNode = 257,
    LastJSDocNode = 281,
    FirstJSDocTagNode = 273,
    LastJSDocTagNode = 281,
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
                members: getMembers(litNode.members)
            };
        }
        default:
            return "I don't know how to handle type " + SyntaxKind[node.kind] + ". Why not submit a PR?";
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
            case ts.SyntaxKind.SyntaxList:
                return children.map(child => visit(child)).filter(node => Boolean(node));
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
