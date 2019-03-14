/*	
 * Copyright 2017 Denis Martin.  This file is part of swadit.
 * 
 * swadit is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * swadit is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with swadit.  If not, see <http://www.gnu.org/licenses/>.
 */

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal, ModalDismissReasons, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs/Subject';

import { Spec as Swagger } from 'swagger-schema-official';
import * as SwaggerParser from 'swagger-parser';
import * as YAML from 'js-yaml';
import * as _ from "lodash";

import { FileModalComponent } from '../components/file-modal/file-modal.component';
import { ConfirmComponent } from '../../../app/shared/modules/editor-modals/confirm/confirm.component';

import * as Swagger20SchemaRoot from '../schemas/2.0/swagger-root.json';
import * as Swagger20SchemaInfo from '../schemas/2.0/swagger-info.json';
import * as Swagger20SchemaContact from '../schemas/2.0/swagger-contact.json';
import * as Swagger20SchemaLicense from '../schemas/2.0/swagger-license.json';
import * as Swagger20SchemaExternalDocs from '../schemas/2.0/swagger-externalDocs.json';
import * as Swagger20SchemaTags from '../schemas/2.0/swagger-tags.json';
import * as Swagger20SchemaSecurityDefinitions from '../schemas/2.0/swagger-securityDefinitions.json';
import * as Swagger20SchemaSecurity from '../schemas/2.0/swagger-security.json';
import * as Swagger20SchemaSchema from '../schemas/2.0/swagger-schema.json';
import * as Swagger20SchemaParameterBody from '../schemas/2.0/swagger-parameterBody.json';
import * as Swagger20SchemaParameterNonBody from '../schemas/2.0/swagger-parameterNonBody.json';
import * as Swagger20SchemaResponse from '../schemas/2.0/swagger-response.json';
import * as Swagger20SchemaOperation from '../schemas/2.0/swagger-operation.json';
import * as Swagger20SchemaHeader from '../schemas/2.0/swagger-header.json';
import { YAMLException } from 'js-yaml';

@Injectable()
export class ApisService 
{
	private readonly _schemas = 
	{
		"2.0": {
			root: Swagger20SchemaRoot.default,
			info: Swagger20SchemaInfo.default,
			contact: Swagger20SchemaContact.default,
			license: Swagger20SchemaLicense.default,
			externalDocs: Swagger20SchemaExternalDocs.default,
			tags: Swagger20SchemaTags.default,
			securityDefinitions: Swagger20SchemaSecurityDefinitions.default,
			security: Swagger20SchemaSecurity.default,
			schema: Swagger20SchemaSchema.default,
			parameterBody: Swagger20SchemaParameterBody.default,
			parameterNonBody: Swagger20SchemaParameterNonBody.default,
			response: Swagger20SchemaResponse.default,
			operation: Swagger20SchemaOperation.default,
			header: Swagger20SchemaHeader.default
		}
	};

	get schemas()
	{
		if (this.current['swagger'] == "2.0") {
			return this._schemas["2.0"];
		}
		return null;
	}

	public current: Object = { 
		swagger: "2.0",
		info: { 
			title: "My new API",
			version: "1.0"
		},
		paths: {}
	}
	public currentFileName: string = "swagger.yaml";
	public lastLoaded: string | ArrayBuffer;
	public hasLoadingErrors: boolean = false;

	filesToAdd = [];
	filesToAddIndex = 0;

	private _eventApiChanged = new Subject<string>();
	eventApiChanged = this._eventApiChanged.asObservable();

	selectedPaths = {};
	activePath: string;

	closeResult: string;
	fileModal: NgbModalRef;
	blob: Blob;
	blobUrl: string;

	methodKeys = ["get", "post", "put", "delete", "options", "head", "patch" ];

	constructor(private modalService: NgbModal, private router: Router) 
	{
		console.info("APIs service initialized");
		this.openFile("assets/petstore.yaml", null);
	}

	openFile(pathName: string, fobj)
	{
		//Swadit.thinking = "Loading file...";
		if (pathName) {
			SwaggerParser.parse(pathName)
				.then(api => { this.swaggerLoaded(api); })
				.catch(err => { this.swaggerLoadingError(err); });
		} else {
			const apis = this;
			let reader = new FileReader();
			reader.onloadend = function(e) {
				apis.lastLoaded = reader.result;
				try {
					SwaggerParser.parse(YAML.safeLoad(reader.result))
						.then(api => { apis.swaggerLoaded(api, fobj.name); })
						.catch(err => { apis.swaggerLoadingError(err, fobj.name); });
				} catch (ex) {
					apis.swaggerLoadingError(ex, fobj.name);
				}
			}
			reader.readAsText(fobj);
		}
	}

	addFile(pathName: string, fobj: any = null, addSource = false)
	{
		console.log("addFile", pathName, fobj, addSource);
		if (pathName) {
			SwaggerParser.parse(pathName)
				.then(api => { this.mergeSwagger(api, null, addSource); })
				.catch(err => { this.swaggerLoadingError(err); });
		} else {
			let apis = this;
			let reader = new FileReader();
			reader.onload = function(e) {
				apis.lastLoaded = reader.result;
				try {
					SwaggerParser.parse(YAML.safeLoad(reader.result))
						.then(api => { apis.mergeSwagger(api, fobj.name, addSource); })
						.catch(err => { apis.swaggerLoadingError(err, fobj.name); });
				} catch (ex) {
					apis.swaggerLoadingError(ex, fobj.name);
				}
			}
			reader.readAsText(fobj);
		}
	}

	swaggerLoaded(api, fileName: string = null) 
	{
		console.log("swaggerLoaded");
		this.current = api;
		this.currentFileName = fileName ? fileName : "swagger.yaml";

		let self = this;
		let apiClone: any = _.cloneDeep(this.current);
		SwaggerParser.validate(apiClone)
			.then(function(api) {
				console.log("This API is a valid Swagger file.");
				self.hasLoadingErrors = false;
				self._eventApiChanged.next(self.currentFileName);
			})
			.catch(function(err) {
				console.log("Swagger validation error: ", err.message);
				self.hasLoadingErrors = true;
				self._eventApiChanged.next(self.currentFileName);
				self.router.navigate(['/source']);
			});
	}

	swaggerLoadingError(err, fileName: string = null)
	{
		console.log("error loading yaml: ", err);
		this.hasLoadingErrors = true;
		this.current = { 
			swagger: "2.0",
			info: { 
				title: "Loading Error",
				version: "1.0"
			},
			paths: {}
		}
		this.currentFileName = fileName ? fileName : "swagger.yaml";
		this._eventApiChanged.next(this.currentFileName);
		this.router.navigate(['/source']);
	}

	mergeSwagger(api, sourceName: string = null, addSource = false)
	{
		console.log("mergeSwagger", api, sourceName, addSource);
		let apis = this;

		var addedPath = [];
		var replacedPath = [];
		var addedParameters = [];
		var replacedParameters = [];
		var addedDefinitions = [];
		var replacedDefinitions = [];
		var addedResponses = [];
		var replacedResponses = [];
		
		if (api.hasOwnProperty('paths')) {
			Object.keys(api.paths).forEach(function(element) {
				if (apis.current['paths'].hasOwnProperty(element)) {
					// replace path
					console.log("Replacing " + element);
					apis.current['paths'][element] = api.paths[element];
					replacedPath.push(element);

				} else {
					// add new path
					console.log("Adding " + element);
					apis.current['paths'][element] = api.paths[element];
					addedPath.push(element);
				}
				if (addSource && sourceName) {
					for (let k of Object.keys(apis.current['paths'][element])) {
						if (k != "parameters") {
							if (!apis.current['paths'][element][k].description) {
								apis.current['paths'][element][k].description = "";
							}
							apis.current['paths'][element][k].description = "Source: " + sourceName + "\n\n" + 
								apis.current['paths'][element][k].description;
						}
					}
				}
				apis.selectedPaths[element] = true;
			});
			console.log("Replaced paths", replacedPath);
			console.log("Added paths", addedPath);
		}

		if (api.hasOwnProperty('parameters')) {
			if (!apis.current['parameters']) {
				apis.current['parameters'] = {};
			}
			Object.keys(api.parameters).forEach(function(element) {
				if (apis.current['parameters'].hasOwnProperty(element)) {
					// replace parameter
					console.log("Replacing " + element);
					apis.current['parameters'][element] = api.parameters[element];
					replacedParameters.push(element);

				} else {
					// add new parameter
					console.log("Adding " + element);
					apis.current['parameters'][element] = api.parameters[element];
					addedParameters.push(element);
				}
			});
			console.log("Replaced parameters", replacedParameters);
			console.log("Added parameters", addedParameters);
		}

		if (api.hasOwnProperty('definitions')) {
			if (!apis.current['definitions']) {
				apis.current['definitions'] = {};
			}
			Object.keys(api.definitions).forEach(function(element) {
				if (apis.current['definitions'].hasOwnProperty(element)) {
					// replace definitions
					console.log("Replacing " + element);
					apis.current['definitions'][element] = api.definitions[element];
					replacedDefinitions.push(element);

				} else {
					// add new definitions
					console.log("Adding " + element);
					apis.current['definitions'][element] = api.definitions[element];
					addedDefinitions.push(element);
				}
			});
			console.log("Replaced definitions", replacedDefinitions);
			console.log("Added definitions", addedDefinitions);
		}

		if (api.hasOwnProperty('responses')) {
			if (!apis.current['responses']) {
				apis.current['responses'] = {};
			}
			Object.keys(api.responses).forEach(function(element) {
				if (apis.current['responses'].hasOwnProperty(element)) {
					// replace response
					console.log("Replacing " + element);
					apis.current['responses'][element] = api.responses[element];
					replacedResponses.push(element);

				} else {
					// add new response
					console.log("Adding " + element);
					apis.current['responses'][element] = api.responses[element];
					addedResponses.push(element);
				}
			});
			console.log("Replaced responses", replacedResponses);
			console.log("Added responses", addedResponses);
		}
		
		this.filesToAddIndex++;
		if (this.filesToAddIndex < this.filesToAdd.length) {
			this.addFile(null, this.filesToAdd[this.filesToAddIndex], addSource);
			
		} else {
			this.filesToAdd = [];

		}
	}

	toYaml(obj: Object): string
	{
		return YAML.dump(obj);
	}

	toJson(obj: any): string
	{
		return JSON.stringify(obj, null, 2);
	}

	hasExtensions(obj: Object): boolean
	{
		if (obj == null) return false;
		for (let k of Object.keys(obj)) {
			if (k.startsWith("x-")) {
				return true;
			}
		}
		return false;
	}

	propertyIsRequired(schema: any, property: string): boolean
	{
		if (schema.required == null) return false;
		for (let rp of schema.required) {
			if (rp == property) return true;
		}
		return false;
	}

	cleanUp(schema: any, api: any)
	{
		if (!api) return;

		if (api['$ref']) {
			this.keys(api).forEach(k => {
				if (k != '$ref') {
					delete api[k];
				}
			});
		} else {
			if (schema['type'] == 'object') {
				if (schema['properties']) {
					this.keys(schema['properties']).forEach(p => {
						if (api[p] != null) {
							this.cleanUp(schema['properties'][p], api[p]);
							if (schema['properties'][p]['type'] == 'array') {
								if (api[p].length == 0 && !this.propertyIsRequired(schema, p)) {
									delete api[p];
								}
							}
							if (schema['properties'][p]['type'] == 'object') {
								if (this.keys(api[p]).length == 0 && !this.propertyIsRequired(schema, p)) {
									delete api[p];
								}
							}
							if (schema['properties'][p]['type'] == 'string') {
								if (api[p] == "" && !this.propertyIsRequired(schema, p)) {
									delete api[p];
								}
							}
						} else {
							delete api[p];
						}
					});
					/* TODO we have incomplete schemas, thus we may not remove additional properties
					if (!schema['additionalProperties']) {
						this.keys(api).forEach(p => {
							if (!p.startsWith("x-") && !schema['properties'][p]) {
								delete api[p];
							}
						});
					}
					*/
					// remove undefined properties
					this.keys(api).forEach(p => {
						if (!schema['properties'][p] && (api[p] === undefined || api[p] === null)) {
							delete api[p];
						}
					});
				// TODO: properties AND additionalProperties
				} else if (schema['additionalProperties']) {
					this.keys(api).forEach(p => {
						if (api[p] != null) {
							this.cleanUp(schema['additionalProperties'], api[p]);
							// we allow additional properties with empty values
						} else {
							delete api[p];
						}
					});
				}
			} else if (schema['type'] == 'array') {
				api.forEach(item => {
					this.cleanUp(schema['items'], item);
				});
			}
		}
	}

	cleanUpSwaggerSchema(obj: any)
	{
		if (!obj) return;

		this.cleanUp(this.schemas.schema, obj);

		if (obj['type'] == "array") {
			delete obj['properties'];
			delete obj['format'];

		} else if (obj['type'] == "object") {
			delete obj['items'];
			delete obj['format'];

		} else {
			delete obj['items'];
			delete obj['properties'];

		}
		// todo: check for additional optional attributes
	}

	createBlobUrl()
	{
		let content = YAML.dump(this.current);
		this.blob = new Blob([ content ], { type : 'text/plain' });
		if (this.blobUrl != '') {
			window.URL.revokeObjectURL(this.blobUrl);
		}
		this.blobUrl = window.URL.createObjectURL(this.blob);
		console.log("Download URL: " + this.blobUrl);
	}

	newFile()
	{
		this.current = { 
			swagger: "2.0",
			info: { 
				title: "My new API",
				version: "1.0"
			},
			paths: {}
		}
		this.currentFileName = "swagger.yaml";
		this._eventApiChanged.next(this.currentFileName);
	}

	openFileModal()
	{
		console.log("openFileModal()");
		this.fileModal = this.modalService.open(FileModalComponent, FileModalComponent.modalOptions);
		this.fileModal.componentInstance.dialogType = "fileOpen";
		this.fileModal.result.then((result) => {
			this.closeResult = `Closed with: ${result}`;
			console.info("openFileModal(): " + this.closeResult);
			if (result.files.length > 0) {
				this.openFile(null, result.files[0]);
			}
			
        }, (reason) => {
			this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
			console.warn("openFileModal(): " + this.closeResult);

        });
	}
	
	addFilesModal()
	{
		console.log("addFileModal()");
		this.fileModal = this.modalService.open(FileModalComponent, FileModalComponent.modalOptions);
		this.fileModal.componentInstance.dialogType = "fileAdd";
		this.fileModal.result.then((result) => {
			this.closeResult = `Closed with: ${result}`;
			console.info("addFileModal(): closed with ", result);
			if (result.files.length > 0) {
				this.filesToAddIndex = 0;
				this.filesToAdd = result.files;
				this.addFile(null, this.filesToAdd[this.filesToAddIndex], result.addSource);
			}
			
        }, (reason) => {
			this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
			console.warn("addFileModal(): dismissed with ", this.getDismissReason(reason));

        });
	}

	private getDismissReason(reason: any): string {
        if (reason === ModalDismissReasons.ESC) {
            return 'by pressing ESC';
        } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
            return 'by clicking on a backdrop';
        } else {
            return  `with: ${reason}`;
        }
	}
	
	downloadFileModal()
	{
		console.log("downloadFileModal()");
		this.createBlobUrl();
		this.fileModal = this.modalService.open(FileModalComponent, FileModalComponent.modalOptions);
		this.fileModal.componentInstance.dialogType = "fileDownload";
		this.fileModal.componentInstance.blob = this.blob;
		this.fileModal.componentInstance.fileName = this.currentFileName;
		
		if (this.hasLoadingErrors) {
			this.fileModal.componentInstance.validationErrors = true;
		} else {
			let fileModal = this.fileModal;
			this.validate(this.current)
				.then(api => { fileModal.componentInstance.validationErrors = false })
				.catch(err => { fileModal.componentInstance.validationErrors = true });
		}

		this.fileModal.result.then((result) => {
			this.closeResult = `Closed with: ${result}`;
			console.info("downloadFileModal(): " + this.closeResult);
			this.currentFileName = result;
			
        }, (reason) => {
			this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
			console.warn("downloadFileModal(): " + this.closeResult);

        });
	}

	filterList(list: Array<string>, filterText: string, sorted: boolean = false): Array<string>
	{
		let filteredList = list;
		if (filterText) {
			let fl = filterText.toLowerCase();
			filteredList = list.filter(s => {
				let sl = s.toLowerCase();
				return sl.indexOf(fl) > -1;
			});
		}
		if (sorted) {
			return filteredList.sort((a, b) => {
				a = a.toLowerCase();
				b = b.toLowerCase();
				if (a == b) return 0;
				if (a > b) return 1;
				return -1;
			});
		} else {
			return filteredList;
		}
	}

	// TODO
	resolveRef(ref: string): any
	{
		if (ref.startsWith("#/definitions/")) {
			let refParts = ref.split('/');
			return this.current['definitions'][refParts[2]];
		}
		if (ref.startsWith("#/parameters/")) {
			let refParts = ref.split('/');
			return this.current['parameters'][refParts[2]];
		}
		if (ref.startsWith("#/responses/")) {
			let refParts = ref.split('/');
			return this.current['responses'][refParts[2]];
		}
		return null;
	}

	resolveObj(obj: any): any
	{
		if (obj) {
			if (obj['$ref']) {
				obj = this.resolveRef(obj['$ref']);
			} 
			if (Array.isArray(obj['allOf'])) {
				let mergedObj = {};
				obj['allOf'].forEach(o => {
					o = this.resolveObj(o);
					if (o) {
						for (let key of Object.keys(o)) {
							if (!mergedObj[key]) {
								mergedObj[key] = _.cloneDeep(o[key]);
							}
						}	
						if (o["properties"]) {
							if (!mergedObj["properties"]) {
								mergedObj["properties"] = {};
							}
							for (let p of Object.keys(o["properties"])) {
								// no recursive resolving
								mergedObj["properties"][p] = o["properties"][p];
							}
						}
						// TODO: additionalProperties? patternedProperties?
						if (mergedObj["type"] != o["type"]) {
							console.warn("allOf objects have different types");
						}
					}
				});
				obj = mergedObj;
			}
		}
		return obj;
	}

	renameObjectKey(obj: any, key: string, newKey: string) 
	{
		var newObj = _.clone(obj);
		Object.keys(obj).forEach(k => delete obj[k]);
		Object.keys(newObj).forEach(k => {
			if (k != key) {
				obj[k] = newObj[k];
			} else {
				obj[newKey] = newObj[key];
			}
		});
		return obj;
	}

	settingsModal()
	{
		alert('Not yet implemented');
	}

	keys(obj)
	{
		if (!obj) return [];
		return Object.keys(obj);
	}

	getLength(obj: any): number
	{
		if (!obj) return 0;
		if (Array.isArray(obj)) return obj.length;
		if (typeof obj == "object") return Object.keys(obj).length;
		return null;
	}

	missingRequiredProperties(schema: any, obj: any): Array<string>
	{
		let missingFields = [];
		if (schema['required']) {
			schema['required'].forEach(p => {
				if (!obj[p]) {
					missingFields.push(p);
				}
			});
		}
		return missingFields;
	}

	selectPath(path: string, event: any)
	{
		if (this.selectedPaths.hasOwnProperty(path)) {
			delete this.selectedPaths[path];
		} else { 
			this.selectedPaths[path] = true;
		}
	}

	selectAllPaths()
	{
		Object.keys(this.current['paths']).forEach(p => this.selectedPaths[p] = true);
	}

	deselectAllPaths()
	{
		this.selectedPaths = {};
	}

	deleteSelectedPaths()
	{
		var paths = Object.keys(this.selectedPaths);
		if (paths.length == 0) {
			ConfirmComponent.open(this.modalService, "Please select a path.", "Ok", null);
		} else {
			ConfirmComponent.open(this.modalService, "Delete " + paths.length + " paths?")
				.then((result) => {
					console.info("deleteSelectedPaths()", result);
					paths.forEach(p => delete this.current['paths'][p]);
					this.selectedPaths = {};
				})
				.catch((reason) => {});
		}
	}

	inverseSelectedPaths()
	{
		var paths = Object.keys(this.selectedPaths);
		if (paths.length == 0) {
			this.selectAllPaths();
		} else if (paths.length == Object.keys(this.current['paths']).length) {
			this.deselectAllPaths();
		} else {
			Object.keys(this.current['paths']).forEach(p => {
				if (this.selectedPaths[p]) {
					delete this.selectedPaths[p];
				} else {
					this.selectedPaths[p] = true;
				}
			});
		}
	}

	generateExample(schema: any, refStack: { [k: string]: boolean }, noReadOnly: boolean = false, forceGeneration: boolean = false): any
	{
		let res: any = undefined;
		if (schema['$ref']) {
			if (refStack['$ref']) {
				// recursion detected
				return null;
			} else {
				refStack['$ref'] = true;
			}
		}
		schema = this.resolveObj(schema);
		if (!schema) {
			return null;
		}
		if (!noReadOnly || !schema.readOnly) {
			if (schema.type == "string") {
				if (schema.example) {
					res = schema.example;
				} else if (schema.default) {
					res = schema.default;
				} else {
					res = "string";
				}
			} else if (schema.type == "boolean") {
				if (schema.example) {
					res = schema.example;
				} else if (schema.default) {
					res = schema.default;
				} else {
					res = false;
				}
			} else if (schema.type == "number" || schema.type == "integer") {
				if (schema.example) {
					res = schema.example;
				} else if (schema.default) {
					res = schema.default;
				} else {
					res = 0;
				}
			} else if (schema.type == "array") {
				if (schema.example && !forceGeneration) {
					res = schema.example;
				} else if (schema.default && !forceGeneration) {
					res = schema.default;
				} else {
					let r = this.generateExample(schema.items, refStack, noReadOnly);
					if (r !== undefined) {
						res = [ r ];
					}
				}
			} else if (schema.type == "object") {
				if (schema.example && !forceGeneration) {
					res = schema.example;
				} else if (schema.default && !forceGeneration) {
					res = schema.default;
				} else {
					res = {};
					this.keys(schema.properties).forEach(k => {
						let refStackCopy = _.cloneDeep(refStack);
						let r = this.generateExample(schema.properties[k], refStackCopy, noReadOnly);
						if (r !== undefined) {
							res[k] = r;
						}
					});
				}
			}
		}
		return res;
	}

	validateStr(input: string): any
	{
		let apis = this;
		return new Promise((resolve, reject) => {
			let api;
			let apiClone;
			try {
				api = YAML.safeLoad(input);
				apiClone = _.cloneDeep(api);
			} catch (ye) {
				reject("YAML Error: " + ye.message);
				return;
			}
			SwaggerParser.validate(api)
				.then(function(api) {
					console.log("This API is a valid Swagger file.");
					// 'api' is modified by SwaggerParser.validate (references are dereferenced)
					resolve(apiClone);
				})
				.catch(function(err) {
					console.log("Swagger validation error: ", err.message);
					reject(err.message);
				});
		});
	}
	
	validate(obj: any): any
	{
		let apis = this;
		return new Promise((resolve, reject) => {
			let apiClone = _.cloneDeep(obj);
			SwaggerParser.validate(apiClone)
				.then(function(api) {
					console.log("This API is a valid Swagger file.");
					// 'apiClone' is modified by SwaggerParser.validate (references are dereferenced)
					resolve(apiClone);
				})
				.catch(function(err) {
					console.log("Swagger validation error: ", err.message);
					reject(err.message);
				});
		});
	}

	getMethods(path: string, api: any = null): Array<object>
	{
		if (!api) {
			api = this.current;
		}
		if (!api['paths']) return [];
		let methodKeys = this.keys(api['paths'][path]);
		_.pull(methodKeys, "parameters");
		let methods: Array<object> = [];
		methodKeys.forEach(m => methods.push({ 
			key: m,
			obj: api['paths'][path][m] 
		}));
		return methods;
	}

	getParameters(api: any, path: string, method: string, includeBody: boolean = true): Array<object>
	{
		if (!api || !api['paths']) return [];
		if (!api['paths'][path]) return [];
		if (!api['paths'][path][method]) return [];

		let parameters: Array<object> = [];
		if (api['paths'][path]['parameters']) {
			parameters = parameters.concat(api['paths'][path]['parameters']);
		}
		if (api['paths'][path][method]['parameters']) {
			parameters = parameters.concat(api['paths'][path][method]['parameters']);
		}
		if (!includeBody) {
			_.remove(parameters, p => { return p['in'] == 'body'; });
		}
		return parameters;
	}

	getBodyParameter(api: any, path: string, method: string): object
	{
		if (!api['paths']) return null;
		if (!api['paths'][path]) return null;
		if (!api['paths'][path][method]) return null;

		let body: object = null;
		if (api['paths'][path]['parameters']) {
			api['paths'][path]['parameters'].forEach(p => {
				if (p['in'] == 'body') {
					body = p;
				}
			});
		}
		if (api['paths'][path][method]['parameters']) {
			api['paths'][path][method]['parameters'].forEach(p => {
				if (p['in'] == 'body') {
					body = p;
				}
			});
		}
		return body;
	}

	getConsumes(api: any, path: string, method: string): any
	{
		if (!api['paths']) return null;
		if (!api['paths'][path]) return null;
		if (!api['paths'][path][method]) return null;

		if (api['paths'][path][method]['consumes']) {
			return api['paths'][path][method]['consumes'];
		} else if (api['consumes']) {
			return api['consumes'];
		}
		return null;
	}

	getProduces(api: any, path: string, method: string): any
	{
		if (!api['paths']) return null;
		if (!api['paths'][path]) return null;
		if (!api['paths'][path][method]) return null;

		if (api['paths'][path][method]['produces']) {
			return api['paths'][path][method]['produces'];
		} else if (api['produces']) {
			return api['produces'];
		}
		return null;
	}
}
