import {
    Component,
    ComponentFactoryResolver,
    ElementRef,
    NgZone,
    OnDestroy,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';

import { Router } from '@angular/router';

import { EnvironmentComponent } from './environment.component';

import { AuthService } from 'jslib/abstractions/auth.service';
import { CryptoFunctionService } from 'jslib/abstractions/cryptoFunction.service';
import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { PasswordGenerationService } from 'jslib/abstractions/passwordGeneration.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { StateService } from 'jslib/abstractions/state.service';
import { StorageService } from 'jslib/abstractions/storage.service';
import { SyncService } from 'jslib/abstractions/sync.service';

import { BroadcasterService } from 'jslib/angular/services/broadcaster.service';

import { LoginComponent as BaseLoginComponent } from 'jslib/angular/components/login.component';
import { ModalComponent } from 'jslib/angular/components/modal.component';

import { CozyClientInstanceOption } from '../../cozy/CozyClientTypes';
import { CozyClientService } from '../../cozy/services/cozy-client.service';

const BroadcasterSubscriptionId = 'LoginComponent';

@Component({
    selector: 'app-login',
    templateUrl: 'login.component.html',
})
export class LoginComponent extends BaseLoginComponent implements OnDestroy {
    @ViewChild('environment', { read: ViewContainerRef, static: true }) environmentModal: ViewContainerRef;
    @ViewChild('masterPwdContainer') masterPwdContainer: ElementRef ;

    showingModal = false;
    isInCozyApp: boolean = false;
    baseUrl: string;
    canAuthWithOIDC = false;
    appIconForOIDC = 'images/icons-login.svg';

    constructor(authService: AuthService, router: Router, i18nService: I18nService,
        syncService: SyncService, private componentFactoryResolver: ComponentFactoryResolver,
        platformUtilsService: PlatformUtilsService, stateService: StateService,
        environmentService: EnvironmentService, passwordGenerationService: PasswordGenerationService,
        cryptoFunctionService: CryptoFunctionService, storageService: StorageService,
        private broadcasterService: BroadcasterService, private ngZone: NgZone, private clientService: CozyClientService) {
        super(authService, router, platformUtilsService, i18nService, stateService, environmentService,
            passwordGenerationService, cryptoFunctionService, storageService);
        super.onSuccessfulLogin = () => {
            return syncService.fullSync(true);
        };
    }

    async ngOnInit() {
        // @override by Cozy
        // check if code is run into a Cozy app
        // if yes, retrieve url and user email from the htlm
        const { domain: cozyDomain } = (this.clientService.GetClient().getInstanceOptions() as CozyClientInstanceOption);
        const domainWithoutPort = cozyDomain && cozyDomain.split(':')[0];

        if (cozyDomain) {
            this.isInCozyApp = true;
            this.email = `me@${domainWithoutPort}`;
            const protocol = window.location ? window.location.protocol : 'https:';
            this.baseUrl =  `${protocol}//${cozyDomain}/`;
            this.environmentService.setUrls({
                base: this.baseUrl + 'bitwarden',
            });
        }
        await this.checkIfClientCanAuthWithOIDC();
        // TODO BJA const cozyToken = cozyDataNode ? cozyDataNode.dataset.cozytoken : null;
        // if (cozyToken) {
        //     await this.storageService.save('accessToken', cozyToken);
        // }

        // end Cozy override
        await super.ngOnInit();
        this.broadcasterService.subscribe(BroadcasterSubscriptionId, async (message: any) => {
            this.ngZone.run(() => {
                switch (message.command) {
                    case 'windowHidden':
                        this.onWindowHidden();
                        break;
                    default:
                }
            });
        });
    }

    async checkIfClientCanAuthWithOIDC() {
        this.canAuthWithOIDC = this.clientService.GetClient().capabilities?.can_auth_with_oidc;
    }

    ngAfterViewInit() {
        const inputContainerEl  = this.masterPwdContainer.nativeElement;
        const labelTxt = this.canAuthWithOIDC ? this.i18nService.t('masterPass-oidc') : this.i18nService.t('masterPass');
        this._turnIntoMaterialInput(inputContainerEl, labelTxt);
    }

    ngOnDestroy() {
        this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);
    }

    settings() {
        const factory = this.componentFactoryResolver.resolveComponentFactory(ModalComponent);
        const modal = this.environmentModal.createComponent(factory).instance;
        modal.onShown.subscribe(() => {
            this.showingModal = true;
        });
        modal.onClosed.subscribe(() => {
            this.showingModal = false;
            modal.onShown.unsubscribe();
            modal.onClosed.unsubscribe();
        });

        const childComponent = modal.show<EnvironmentComponent>(EnvironmentComponent,
            this.environmentModal);
        childComponent.onSaved.subscribe(() => {
            modal.close();
        });
    }

    onWindowHidden() {
        this.showPassword = false;
    }

    openHint() {
        window.open(this.baseUrl + 'auth/passphrase_reset');
    }

    /* --------------------------------------------------------------------- */
    // Prepare an input element to have a material UX
    _turnIntoMaterialInput(container: any, labelText: string) { // BJA : labelEL to be removed
        // const container = inputEl.closest('.material-input');
        const inputEl = container.querySelector('input');
        container.querySelectorAll('label').forEach((label: any) => {label.textContent = labelText; });
        container.addEventListener('click', () => {
            inputEl.focus();
        });
        let isFocusedOrFilled = false;
        const initialPlaceholder = inputEl.placeholder;
        // init input state
        if (inputEl.value) {
            container.classList.add('focused-or-filled');
            inputEl.placeholder = initialPlaceholder;
            isFocusedOrFilled = true;
        }
        inputEl.addEventListener('focus', () => {
            container.classList.add('focused-or-filled');
            setTimeout( () => {inputEl.placeholder = initialPlaceholder; }, 100);
            isFocusedOrFilled = true;
        });
        inputEl.addEventListener('blur', () => {
            // console.log('blur to transition a meterial UI Input');
            if (!inputEl.value) {
                container.classList.remove('focused-or-filled');
                inputEl.placeholder = '';
                isFocusedOrFilled = false;
            }
        });
        inputEl.addEventListener('input', () => {
            // console.log('input HEARD !!!');
            if (!isFocusedOrFilled && inputEl.value) {
                container.classList.add('focused-or-filled');
                inputEl.placeholder = initialPlaceholder;
                isFocusedOrFilled = true;
            }
        });
        const visibilityBtn = container.querySelector('.visibility-btn');
        if (!visibilityBtn) { return; }
        const that = this;
        visibilityBtn.addEventListener('click', () => {
            if (that.showPassword) {
                inputEl.type = 'password';
                visibilityBtn.firstElementChild.classList.replace('fa-eye-slash', 'fa-eye');
            } else {
                inputEl.type = 'text';
                visibilityBtn.firstElementChild.classList.replace('fa-eye', 'fa-eye-slash');
            }
            that.showPassword = !that.showPassword;
        });
    }

}
