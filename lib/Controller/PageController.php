<?php

namespace OCA\NxcGantt\Controller;

use OCP\IRequest;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Controller;

class PageController extends Controller
{

    public function __construct($AppName, IRequest $request)
    {
        parent::__construct($AppName, $request);
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function index()
    {
        // Pass initial data or config here if needed
        return new TemplateResponse('nxc_gantt', 'main');
    }
}
