import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ApisService } from './shared';
import { AuthGuard } from './shared';
import { FileModalComponent } from './shared/components/file-modal/file-modal.component';
import { EditorModalsModule } from './shared/modules/editor-modals/editor-modals.module';
import { AceEditorModule } from 'ng2-ace-editor';

@NgModule({
  declarations: [
    AppComponent,
    // FileModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    EditorModalsModule,
    AceEditorModule
  ],
  providers: [AuthGuard,ApisService],
  bootstrap: [AppComponent],
  // entryComponents: [FileModalComponent]

})
export class AppModule { }
