import { Component } from '@angular/core';

import { SwaggerUIBundle } from 'swagger-ui-dist';
import { SwaggerUIStandalonePreset } from 'swagger-ui-dist';
import { ApisService } from './shared/services';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'angular-swagger';

  swaggeruiFrame: any;
  swaggerUi: any;

  text;
  options: any = { printMargin: true };
  message: string = null;
  validationPassed: boolean = null;
  applied: boolean = null;
  skipReset: boolean = false;


  constructor(public apis: ApisService) {
    // code
    this.apis.eventApiChanged.subscribe(param => {
      this.revert();
    });
    // UI
    this.apis.eventApiChanged.subscribe(param => {
      this.swaggerUi.getSystem().specActions.updateSpec(JSON.stringify(this.apis.current));
    });

  }
  onChange(text) {
    //console.log(text);
    if (!this.skipReset) {
      this.validationPassed = null;
      this.applied = null;
    } else {
      this.skipReset = false;
    }
  }
  
  revert() {
    if (this.apis.current) {
      this.text = this.apis.hasLoadingErrors ? this.apis.lastLoaded : this.apis.toYaml(this.apis.current);
      this.skipReset = true;
      this.validate();

      this.apis.eventApiChanged.subscribe(param => {
      });
    }
  }
  validate() {
    let self = this;
    self.validationPassed = null;
    self.applied = null;
    this.apis.validateStr(this.text)
      .then(api => {
        self.message = null;
        self.validationPassed = true;

      })
      .catch(msg => {
        self.message = msg;
        self.validationPassed = false;
      });
  }
 

  apply() {
    let self = this;
    self.validationPassed = null;
    self.applied = null;
    this.apis.validateStr(this.text)
      .then(api => {
        self.message = null;
        self.validationPassed = true;
        self.applied = true;
        self.apis.hasLoadingErrors = false;
        self.apis.current = api;
        this.getData()
      })
      .catch(msg => {
        self.message = msg;
        self.validationPassed = false;
        self.applied = null;
      });

  }

  getData(){
    this.swaggerUi = new SwaggerUIBundle({
      dom_id: "#swaggerui",
      spec: this.apis.current,
      validatorUrl: null
      /*presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],*/
    });
    window['swaggerUi'] = this.swaggerUi;
  }

  ngOnInit() {
    this.revert();
    this.swaggerUi = new SwaggerUIBundle({
      dom_id: "#swaggerui",
      spec: this.apis.current,
      validatorUrl: null
			/*presets: [
				SwaggerUIBundle.presets.apis,
				SwaggerUIStandalonePreset
			],*/
    });
    window['swaggerUi'] = this.swaggerUi;
  }
}
