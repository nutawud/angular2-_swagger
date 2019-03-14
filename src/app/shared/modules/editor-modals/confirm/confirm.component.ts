import { Component, OnInit } from '@angular/core';
import { NgbModal, ModalDismissReasons, NgbModalRef, NgbModalOptions, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
	selector: 'app-confirm',
	templateUrl: './confirm.component.html',
	styleUrls: ['../editor-modals.scss']
})
export class ConfirmComponent implements OnInit 
{
	static readonly modalOptions: NgbModalOptions = {
		size: "sm"
	}

	text: string;
	okText: string;
	cancelText: string;

	constructor(public activeModal: NgbActiveModal) { }

	ngOnInit() {
	}

	ok()
	{
		this.activeModal.close('ok');
	}

	public static open(modalService: NgbModal, text: string, 
		okText: string = "Ok", cancelText: string = "Cancel"): any
	{
		let modal: NgbModalRef;
		modal = modalService.open(ConfirmComponent, ConfirmComponent.modalOptions);
		modal.componentInstance.text = text;
		modal.componentInstance.okText = okText;
		modal.componentInstance.cancelText = cancelText;
		return modal.result;
	}
}
