import * as React from 'react';
import { isEqual, isEmpty } from 'lodash';
import { Resolve } from '@paperbits/react/decorators';
import { IMediaService } from '@paperbits/common/media';
import { MediaContract } from '@paperbits/common/media/mediaContract';
import { EventManager } from '@paperbits/common/events';
import { DefaultButton, Modal, PrimaryButton, Stack, Text, TextField } from '@fluentui/react';
import { CopyableTextField } from '../utils/components/copyableTextField';
import { REQUIRED, UNIQUE_REQUIRED, URL_REQUIRED, validateField } from '../utils/validator';
import { reservedPermalinks } from '../../constants';

interface NonImageDetailsModalState {
    mediaItem: MediaContract,
    errors: object
}

interface NonImageDetailsModalProps {
    mediaItem: MediaContract,
    onDismiss: () => void
}

const textFieldStyles = { root: { paddingBottom: 15 } };

export class NonImageDetailsModal extends React.Component<NonImageDetailsModalProps, NonImageDetailsModalState> {
    @Resolve('mediaService')
    public mediaService: IMediaService;

    @Resolve('eventManager')
    public eventManager: EventManager;

    constructor(props: NonImageDetailsModalProps) {
        super(props);

        this.state = {
            mediaItem: this.props.mediaItem,
            errors: {}
        }
    }

    onInputChange = async (field: string, newValue: string, validationType?: string): Promise<void> => {
        let errorMessage = '';
        let errors = {};

        if (field === 'permalink') {
            errorMessage = await this.validatePermalink(newValue);
        } else if (validationType) {
            errorMessage = validateField(validationType, newValue);
        }

        if (errorMessage !== '' && !this.state.errors[field]) {
            errors = { ...this.state.errors, [field]: errorMessage };
        } else if (errorMessage === '' && this.state.errors[field]) {
            const { [field as keyof typeof this.state.errors]: error, ...rest } = this.state.errors;
            errors = rest;
        } else {
            errors = this.state.errors;
        }

        this.setState({
            mediaItem: {
                ...this.state.mediaItem,
                [field]: newValue
            },
            errors
        });
    }

    validatePermalink = async (permalink: string): Promise<string> => {
        if (permalink === this.props.mediaItem?.permalink) return '';

        const isPermalinkNotDefined = !(await this.mediaService.getMediaByPermalink(permalink)) && !reservedPermalinks.includes(permalink);
        let errorMessage = validateField(UNIQUE_REQUIRED, permalink, isPermalinkNotDefined);

        if (errorMessage === '') errorMessage = validateField(URL_REQUIRED, permalink);

        return errorMessage;
    }

    saveMedia = async (): Promise<void> => {
        const permalinkError = await this.validatePermalink(this.state.mediaItem.permalink);
        if (permalinkError) {
            this.setState({ errors: { permalink: permalinkError } });

            return;
        }

        return;

        await this.mediaService.updateMedia(this.state.mediaItem);
        this.eventManager.dispatchEvent('onSaveChanges');
        this.props.onDismiss();
    }
    
    render(): JSX.Element {
        return <>
            <Modal
                isOpen={true}
                onDismiss={this.props.onDismiss}
                containerClassName="admin-modal"
            >
                <Stack horizontal horizontalAlign="space-between" verticalAlign="center" className="admin-modal-header">
                    <Text block nowrap className="admin-modal-header-text">Media / { this.state.mediaItem.fileName }</Text>
                    <Stack horizontal tokens={{ childrenGap: 20 }}>
                        <PrimaryButton
                            text="Save"
                            onClick={() => this.saveMedia()}
                            disabled={isEqual(this.props.mediaItem, this.state.mediaItem) || !isEmpty(this.state.errors)}
                        />
                        <DefaultButton
                            text="Discard"
                            onClick={this.props.onDismiss}
                        />
                    </Stack>
                </Stack>
                <div className="admin-modal-content">
                    <TextField
                        label="File name"
                        value={this.state.mediaItem.fileName}
                        onChange={(event, newValue) => this.onInputChange('fileName', newValue, REQUIRED)}
                        errorMessage={this.state.errors['fileName'] ?? ''}
                        styles={textFieldStyles}
                        required
                    />
                    <TextField
                        label="Permalink"
                        value={this.state.mediaItem.permalink}
                        onChange={(event, newValue) => this.onInputChange('permalink', newValue)}
                        errorMessage={this.state.errors['permalink'] ?? ''}
                        styles={textFieldStyles}
                        required
                    />
                    <CopyableTextField
                        fieldLabel="Reference URL"
                        showLabel={true}
                        copyableValue={this.state.mediaItem.downloadUrl}
                    />
                    <TextField
                        label="Description"
                        multiline
                        autoAdjustHeight
                        value={this.state.mediaItem.description}
                        onChange={(event, newValue) => this.onInputChange('description', newValue)}
                        styles={textFieldStyles}
                    />
                    <TextField
                        label="Keywords"
                        placeholder="e.g. about"
                        value={this.state.mediaItem.keywords}
                        onChange={(event, newValue) => this.onInputChange('keywords', newValue)}
                    />
                </div>
            </Modal>
        </>
    }
}