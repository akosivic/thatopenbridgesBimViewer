import React from 'react';
import { createComponent } from '@lit/react';
import { WorldViewer } from "./common/WorldViewer";


export const WorldViewerComponent = createComponent({
    tagName: 'world-viewer',
    elementClass: WorldViewer,
    react: React,
    events: {
        onactivate: 'activate',
        onchange: 'change',
    },
});