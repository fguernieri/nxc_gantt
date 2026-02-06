<?php

declare(strict_types=1);

namespace OCA\NxcGantt\Controller;

use OCP\IRequest;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Controller;
use OCA\NxcGantt\AppInfo\Application;

class PageController extends Controller {

    public function __construct(string $AppName, IRequest $request) {
        parent::__construct($AppName, $request);
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function index(): TemplateResponse {
        // Pass initial data or config here if needed
        return new TemplateResponse(Application::APP_ID, 'main');
    }
}
